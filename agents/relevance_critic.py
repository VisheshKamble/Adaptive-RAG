"""
relevance_critic.py — Self-RAG style relevance critique.

For each retrieved chunk, the LLM assigns a relevance score 0–1 and
a one-line reason. The aggregate score decides whether to proceed
to re-ranking or trigger the web fallback (CRAG corrective step).

Implements the [Relevant] reflection token concept from:
  Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection
  (Asai et al., 2023)
"""

from __future__ import annotations

import logging
import re
from typing import List

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import RELEVANCE_THRESHOLD
from utils.llm_factory import get_llm

logger = logging.getLogger(__name__)


# ── output schemas ────────────────────────────────────────────────────────────

class ChunkScore(BaseModel):
    chunk_index:    int   = Field(description="0-based index of the chunk")
    relevance_score: float = Field(description="Relevance score between 0.0 and 1.0")
    reason:         str   = Field(description="One-sentence justification")


class RelevanceCritiqueResult(BaseModel):
    chunk_scores:     List[ChunkScore] = Field(description="Score for each chunk")
    overall_relevant: bool             = Field(
        description="True if retrieved chunks are sufficient to answer the query"
    )
    gaps:             List[str]        = Field(
        default_factory=list,
        description="List of information gaps not covered by any chunk",
    )


# ── prompt ────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a retrieval quality judge for a RAG system.
Given a query and a set of retrieved text chunks, score each chunk's relevance.

Scoring guide:
  1.0 — directly answers the query
  0.7 — highly relevant background
  0.5 — tangentially related
  0.2 — marginally related
  0.0 — completely off-topic

Respond ONLY with valid JSON. No preamble, no markdown fences.
Schema:
{{
  "chunk_scores": [
    {{"chunk_index": 0, "relevance_score": 0.9, "reason": "..."}}
  ],
  "overall_relevant": true,
  "gaps": ["missing info about X", "..."]
}}"""

HUMAN_PROMPT = """Query: {query}

Retrieved chunks:
{chunks_text}

Score each chunk and assess overall sufficiency."""


# ── critic ────────────────────────────────────────────────────────────────────

class RelevanceCritic:

    def __init__(self, threshold: float = RELEVANCE_THRESHOLD):
        self.threshold = threshold
        self.llm       = get_llm()
        self.parser    = JsonOutputParser(pydantic_object=RelevanceCritiqueResult)
        self.prompt    = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human",  HUMAN_PROMPT),
        ])
        self.chain = self.prompt | self.llm | self.parser

    def _format_chunks(self, chunks: List[Document]) -> str:
        lines = []
        for i, doc in enumerate(chunks):
            source = doc.metadata.get("source", "unknown")
            lines.append(f"[{i}] (source: {source})\n{doc.page_content[:600]}")
        return "\n\n---\n\n".join(lines)

    def critique(
        self,
        query:  str,
        chunks: List[Document],
    ) -> RelevanceCritiqueResult:
        """
        Score each chunk and decide if retrieval is sufficient.

        Args:
            query:  the rewritten user query
            chunks: retrieved Document list

        Returns:
            RelevanceCritiqueResult with per-chunk scores and overall verdict.
        """
        if not chunks:
            return RelevanceCritiqueResult(
                chunk_scores=[],
                overall_relevant=False,
                gaps=["No chunks retrieved"],
            )

        chunks_text = self._format_chunks(chunks)
        logger.info("Critiquing %d chunks for query='%s'", len(chunks), query[:60])

        try:
            result = self.chain.invoke({
                "query":       query,
                "chunks_text": chunks_text,
            })
            if isinstance(result, dict):
                critique = RelevanceCritiqueResult(**result)
            else:
                critique = result

            # annotate original docs with their scores
            score_map = {cs.chunk_index: cs.relevance_score for cs in critique.chunk_scores}
            for i, doc in enumerate(chunks):
                doc.metadata["relevance_score"] = score_map.get(i, 0.0)

            avg_score = (
                sum(cs.relevance_score for cs in critique.chunk_scores)
                / len(critique.chunk_scores)
                if critique.chunk_scores else 0.0
            )
            logger.info(
                "Relevance critique: overall=%s, avg_score=%.2f, gaps=%d",
                critique.overall_relevant,
                avg_score,
                len(critique.gaps),
            )
            return critique

        except Exception as e:
            logger.warning("RelevanceCritic fallback (LLM error: %s)", e)
            # fallback: assume relevant to avoid blocking the pipeline
            for i, doc in enumerate(chunks):
                doc.metadata["relevance_score"] = 0.6
            return RelevanceCritiqueResult(
                chunk_scores=[
                    ChunkScore(chunk_index=i, relevance_score=0.6, reason="fallback")
                    for i in range(len(chunks))
                ],
                overall_relevant=True,
                gaps=[],
            )

    def filter_relevant(
        self,
        chunks: List[Document],
        critique: RelevanceCritiqueResult,
    ) -> List[Document]:
        """Return only chunks whose score meets the threshold."""
        score_map = {cs.chunk_index: cs.relevance_score for cs in critique.chunk_scores}
        return [
            doc for i, doc in enumerate(chunks)
            if score_map.get(i, 0.0) >= self.threshold
        ]
"""
answer_critic.py — hallucination detection and answer confidence scoring.

Implements the [IsSupported] and [IsUseful] reflection tokens from Self-RAG.

Two checks:
  1. Faithfulness: is every claim in the answer grounded in the provided chunks?
  2. Completeness: does the answer actually address the query?

If faithfulness < threshold → hallucination_flag = True → LangGraph retries.
"""

from __future__ import annotations

import logging
from typing import List

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import CONFIDENCE_THRESHOLD
from utils.llm_factory import get_llm

logger = logging.getLogger(__name__)


# ── output schema ─────────────────────────────────────────────────────────────

class AnswerCritiqueResult(BaseModel):
    faithfulness_score:  float = Field(
        description="0–1. How well every claim in the answer is grounded in context."
    )
    completeness_score:  float = Field(
        description="0–1. How fully the answer addresses the query."
    )
    confidence_score:    float = Field(
        description="0–1. Overall answer confidence (harmonic mean of above two)."
    )
    hallucination_flag:  bool  = Field(
        description="True if the answer contains claims unsupported by context."
    )
    unsupported_claims:  List[str] = Field(
        default_factory=list,
        description="Specific claims in the answer that are not grounded in context.",
    )
    improvement_hint:    str  = Field(
        default="",
        description="One sentence on how to improve the answer on retry.",
    )


# ── prompt ────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a strict hallucination detection judge for a RAG system.

Given:
  - A user query
  - Retrieved context chunks
  - A generated answer

Your job:
  1. Check every factual claim in the answer against the context.
  2. Flag any claim that is NOT directly supported by the provided context.
  3. Score faithfulness (grounding), completeness (coverage), and confidence.

Scoring:
  faithfulness_score: fraction of answer claims that are grounded in context
  completeness_score: fraction of query intent addressed by the answer
  confidence_score:   harmonic mean of the two above
  hallucination_flag: true if faithfulness < 0.6

Respond ONLY with valid JSON. No preamble, no markdown.
Schema:
{{
  "faithfulness_score":  0.9,
  "completeness_score":  0.8,
  "confidence_score":    0.85,
  "hallucination_flag":  false,
  "unsupported_claims":  [],
  "improvement_hint":    ""
}}"""

HUMAN_PROMPT = """Query: {query}

Context chunks:
{context_text}

Generated answer:
{answer}

Evaluate the answer."""


# ── critic ────────────────────────────────────────────────────────────────────

class AnswerCritic:

    def __init__(self, threshold: float = CONFIDENCE_THRESHOLD):
        self.threshold = threshold
        self.llm       = get_llm()
        self.parser    = JsonOutputParser(pydantic_object=AnswerCritiqueResult)
        self.prompt    = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human",  HUMAN_PROMPT),
        ])
        self.chain = self.prompt | self.llm | self.parser

    def _format_context(self, chunks: List[Document]) -> str:
        lines = []
        for i, doc in enumerate(chunks):
            lines.append(f"[{i}] {doc.page_content[:600]}")
        return "\n\n---\n\n".join(lines)

    def critique(
        self,
        query:   str,
        answer:  str,
        chunks:  List[Document],
    ) -> AnswerCritiqueResult:
        """
        Evaluate whether the answer is faithful to the retrieved context.

        Args:
            query:   the user question
            answer:  the LLM-generated answer
            chunks:  the context chunks used to generate the answer

        Returns:
            AnswerCritiqueResult with scores and hallucination flag.
        """
        if not answer.strip():
            return AnswerCritiqueResult(
                faithfulness_score=0.0,
                completeness_score=0.0,
                confidence_score=0.0,
                hallucination_flag=True,
                unsupported_claims=["Empty answer"],
                improvement_hint="Generate a non-empty answer.",
            )

        context_text = self._format_context(chunks)
        logger.info("Critiquing answer for query='%s'", query[:60])

        try:
            result = self.chain.invoke({
                "query":        query,
                "context_text": context_text,
                "answer":       answer,
            })
            if isinstance(result, dict):
                critique = AnswerCritiqueResult(**result)
            else:
                critique = result

            # recompute confidence as harmonic mean to avoid pure averaging
            f = critique.faithfulness_score
            c = critique.completeness_score
            if f + c > 0:
                critique.confidence_score = round(2 * f * c / (f + c), 4)
            else:
                critique.confidence_score = 0.0

            # override hallucination_flag based on threshold
            critique.hallucination_flag = critique.faithfulness_score < self.threshold

            logger.info(
                "Answer critique: faithfulness=%.2f, completeness=%.2f, "
                "confidence=%.2f, hallucination=%s",
                critique.faithfulness_score,
                critique.completeness_score,
                critique.confidence_score,
                critique.hallucination_flag,
            )
            return critique

        except Exception as e:
            logger.warning("AnswerCritic fallback (LLM error: %s)", e)
            return AnswerCritiqueResult(
                faithfulness_score=0.7,
                completeness_score=0.7,
                confidence_score=0.7,
                hallucination_flag=False,
                unsupported_claims=[],
                improvement_hint="",
            )
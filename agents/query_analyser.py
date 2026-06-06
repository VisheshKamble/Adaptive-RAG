"""
query_analyser.py — query rewriting and decomposition agent.

Two jobs:
  1. Rewrite: fix typos, expand abbreviations, make the query more
     retrieval-friendly (HyDE-lite approach).
  2. Decompose: if the query has multiple sub-questions, split them so
     each can be answered independently and merged.

Returns a structured QueryAnalysis object (Pydantic).
"""

from __future__ import annotations

import logging
from typing import List

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import LLM_MODEL, LLM_TEMPERATURE, LLM_PROVIDER
from utils.llm_factory import get_llm

logger = logging.getLogger(__name__)


# ── output schema ─────────────────────────────────────────────────────────────

class QueryAnalysis(BaseModel):
    rewritten_query: str = Field(
        description="A cleaner, more retrieval-friendly version of the original query."
    )
    sub_questions: List[str] = Field(
        default_factory=list,
        description="If the query has multiple distinct sub-questions, list them. "
                    "Empty list if the query is already atomic.",
    )
    query_type: str = Field(
        description="One of: factual | analytical | comparative | conversational"
    )
    requires_web: bool = Field(
        default=False,
        description="True if the query likely requires real-time or recent information.",
    )


# ── prompt ────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a query analysis assistant for a RAG system.
Your job is to prepare the user's question for optimal retrieval.

Rules:
- Rewrite the query to be specific, unambiguous, and retrieval-friendly.
- If the query contains multiple distinct questions, list them as sub_questions.
- If the query is already simple and atomic, leave sub_questions as [].
- Set requires_web=true ONLY if the question clearly needs real-time data
  (news, prices, current events).

Respond ONLY with valid JSON matching this schema:
{{
  "rewritten_query": "...",
  "sub_questions": ["...", "..."],
  "query_type": "factual|analytical|comparative|conversational",
  "requires_web": false
}}
No preamble, no explanation, no markdown fences."""

HUMAN_PROMPT = """Original query: {query}
Memory context (recent conversation): {memory_context}

Analyse and return JSON."""


# ── agent ─────────────────────────────────────────────────────────────────────

class QueryAnalyser:

    def __init__(self):
        self.llm    = get_llm()
        self.parser = JsonOutputParser(pydantic_object=QueryAnalysis)
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", HUMAN_PROMPT),
        ])
        self.chain = self.prompt | self.llm | self.parser

    def analyse(self, query: str, memory_context: str = "") -> QueryAnalysis:
        """
        Args:
            query:          raw user question
            memory_context: recent chat/entity context from memory graph

        Returns:
            QueryAnalysis with rewritten query, sub-questions, type, web flag.
        """
        logger.info("Analysing query: '%s'", query[:80])
        try:
            result = self.chain.invoke({
                "query":          query,
                "memory_context": memory_context or "None",
            })
            if isinstance(result, dict):
                analysis = QueryAnalysis(**result)
            else:
                analysis = result

            logger.info(
                "Query analysis → rewritten='%s', sub_questions=%d, requires_web=%s",
                analysis.rewritten_query[:60],
                len(analysis.sub_questions),
                analysis.requires_web,
            )
            return analysis

        except Exception as e:
            logger.warning("QueryAnalyser fallback (LLM error: %s)", e)
            # graceful fallback: return query as-is
            return QueryAnalysis(
                rewritten_query=query,
                sub_questions=[],
                query_type="factual",
                requires_web=False,
            )
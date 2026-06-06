"""
memory_updater.py — extract entities and relationships from the Q&A
                    exchange and persist them to the memory graph.

After every successful answer, we extract:
  - Named entities (people, orgs, concepts, numbers, dates)
  - Relationships between entities
  - The user's apparent intent / topic interest

These feed the memory graph so future queries can leverage context
from past conversations — moving beyond stateless RAG.
"""

from __future__ import annotations

import logging
from typing import List, Tuple

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from utils.llm_factory import get_llm

logger = logging.getLogger(__name__)


# ── output schema ─────────────────────────────────────────────────────────────

class Entity(BaseModel):
    name:        str = Field(description="Entity name (normalised, title case)")
    entity_type: str = Field(description="PERSON | ORG | CONCEPT | DATE | NUMBER | LOCATION | OTHER")


class Relation(BaseModel):
    subject:  str = Field(description="Source entity name")
    predicate: str = Field(description="Relationship verb/label (e.g. 'works_at', 'is_part_of')")
    obj:      str = Field(description="Target entity name")


class MemoryExtractionResult(BaseModel):
    entities:       List[Entity]   = Field(default_factory=list)
    relations:      List[Relation] = Field(default_factory=list)
    topic_summary:  str            = Field(
        description="One-sentence summary of what this Q&A was about."
    )
    user_intent:    str            = Field(
        description="What the user is trying to accomplish or understand."
    )


# ── prompt ────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a knowledge extraction agent.
Given a question and its answer, extract:
  1. Named entities with their types.
  2. Relationships between those entities.
  3. A topic summary and inferred user intent.

Keep entity names normalised (consistent capitalisation, no duplicates).
Relationships should use snake_case predicates (e.g. "is_ceo_of", "located_in").

Respond ONLY with valid JSON. No preamble, no markdown fences.
Schema:
{{
  "entities": [{{"name": "...", "entity_type": "..."}}],
  "relations": [{{"subject": "...", "predicate": "...", "obj": "..."}}],
  "topic_summary": "...",
  "user_intent": "..."
}}"""

HUMAN_PROMPT = """Question: {query}
Answer: {answer}

Extract entities, relations, and summarise."""


# ── updater ───────────────────────────────────────────────────────────────────

class MemoryUpdater:

    def __init__(self):
        self.llm    = get_llm()
        self.parser = JsonOutputParser(pydantic_object=MemoryExtractionResult)
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human",  HUMAN_PROMPT),
        ])
        self.chain = self.prompt | self.llm | self.parser

    def extract(
        self,
        query:  str,
        answer: str,
    ) -> MemoryExtractionResult:
        """
        Extract structured knowledge from a Q&A pair.

        Args:
            query:  the user question
            answer: the system's final answer

        Returns:
            MemoryExtractionResult ready to be written to the graph store.
        """
        logger.info("Extracting memory from Q&A: '%s'", query[:60])

        try:
            result = self.chain.invoke({"query": query, "answer": answer})
            if isinstance(result, dict):
                extraction = MemoryExtractionResult(**result)
            else:
                extraction = result

            logger.info(
                "Memory extracted: %d entities, %d relations",
                len(extraction.entities),
                len(extraction.relations),
            )
            return extraction

        except Exception as e:
            logger.warning("MemoryUpdater fallback (LLM error: %s)", e)
            return MemoryExtractionResult(
                entities=[],
                relations=[],
                topic_summary=query[:100],
                user_intent="unknown",
            )
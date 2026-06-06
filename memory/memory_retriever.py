"""
memory_retriever.py — retrieve relevant context from the knowledge graph
                       to augment retrieval with conversational history.

Extracts entities from the current query, finds them in the graph,
and returns a compact natural-language summary of what we know about them.
"""

from __future__ import annotations

import logging
import re
from typing import List, Optional

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from memory.graph_store import GraphStore

logger = logging.getLogger(__name__)


def _simple_ner(text: str) -> List[str]:
    """
    Fast heuristic NER: extract capitalised multi-word phrases.
    Good enough for matching against graph node names.
    """
    # Match sequences of capitalized words (2+ words or single long word)
    candidates = re.findall(r'\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b', text)
    # Also include acronyms
    acronyms = re.findall(r'\b[A-Z]{2,}\b', text)
    return list(set(candidates + acronyms))


class MemoryRetriever:
    """
    Queries the knowledge graph for context relevant to the current query.
    Returns a compact string suitable for prepending to the LLM context.
    """

    def __init__(self, graph_store: GraphStore):
        self.graph = graph_store

    def retrieve_context(
        self,
        query:       str,
        max_triples: int = 15,
    ) -> str:
        """
        Build a memory context string from the knowledge graph.

        Steps:
          1. Extract entity candidates from the query using simple NER.
          2. Match candidates against graph nodes (exact + fuzzy).
          3. Retrieve subgraph triples up to max_triples.
          4. Format as readable text.

        Args:
            query:       current user query
            max_triples: cap on number of triples to include

        Returns:
            A paragraph of relevant prior knowledge, or "" if graph is empty.
        """
        if self.graph.graph.number_of_nodes() == 0:
            return ""

        # extract candidate entities from query
        candidates = _simple_ner(query)
        # also search graph for partial matches
        matched_entities: List[str] = []
        for cand in candidates:
            matches = self.graph.search_entities(cand)
            matched_entities.extend(matches)

        # deduplicate
        matched_entities = list(set(matched_entities))[:5]  # cap at 5 anchors

        if not matched_entities:
            # fall back to top entities
            top = self.graph.get_top_entities(5)
            matched_entities = [name for name, _ in top]

        if not matched_entities:
            return ""

        # collect triples from subgraph around matched entities
        all_triples = []
        for entity in matched_entities:
            triples = self.graph.get_entity_context(entity, depth=2)
            all_triples.extend(triples)

        # deduplicate and cap
        seen = set()
        unique_triples = []
        for t in all_triples:
            key = (t["subject"], t["predicate"], t["object"])
            if key not in seen:
                seen.add(key)
                unique_triples.append(t)

        unique_triples = sorted(
            unique_triples,
            key=lambda x: x.get("weight", 1.0),
            reverse=True
        )[:max_triples]

        if not unique_triples:
            return ""

        # format as natural-language context
        lines = ["Relevant prior knowledge from conversation history:"]
        for t in unique_triples:
            lines.append(
                f"  • {t['subject']} {t['predicate'].replace('_', ' ')} {t['object']}"
            )

        context = "\n".join(lines)
        logger.debug(
            "MemoryRetriever: %d triples retrieved for %d entities",
            len(unique_triples),
            len(matched_entities),
        )
        return context

    def get_stats(self) -> dict:
        return self.graph.stats()
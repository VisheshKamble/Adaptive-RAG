"""
bm25_retriever.py — sparse BM25 keyword retrieval.

BM25 excels at exact-match queries and rare terms that dense embeddings
can miss (e.g. model numbers, proper nouns, technical jargon).
Combining it with vector search via RRF gives the best of both worlds.
"""

from __future__ import annotations

import logging
from typing import List, Tuple

import numpy as np
from langchain_core.documents import Document

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import TOP_K_BM25
from ingestion.embedder import Embedder

logger = logging.getLogger(__name__)


def _tokenise(text: str) -> List[str]:
    return text.lower().split()


class BM25Retriever:
    """
    BM25Okapi retriever backed by the same Embedder metadata store.
    Returns (Document, bm25_score) tuples.
    """

    def __init__(self, embedder: Embedder):
        if not embedder.is_loaded():
            raise RuntimeError("Embedder index is not loaded.")
        self.embedder = embedder

    def retrieve(
        self,
        query: str,
        top_k: int = TOP_K_BM25,
    ) -> List[Tuple[Document, float]]:
        """
        Args:
            query: natural-language question
            top_k: number of results to return

        Returns:
            List of (Document, bm25_score) sorted highest-first.
        """
        tokens = _tokenise(query)
        scores = self.embedder.bm25.get_scores(tokens)          # ndarray len == corpus size
        top_k  = min(top_k, len(scores))
        top_indices = np.argsort(scores)[::-1][:top_k]

        results: List[Tuple[Document, float]] = []
        for idx in top_indices:
            score = float(scores[idx])
            if score <= 0.0:
                continue                                         # irrelevant
            meta = self.embedder.metadata[idx]
            text = meta.pop("text")
            doc  = Document(page_content=text, metadata=dict(meta))
            meta["text"] = text
            results.append((doc, score))

        logger.debug(
            "BM25Retriever: query='%s' → %d results (top score %.3f)",
            query[:60],
            len(results),
            results[0][1] if results else 0.0,
        )
        return results

    def retrieve_docs(self, query: str, top_k: int = TOP_K_BM25) -> List[Document]:
        return [doc for doc, _ in self.retrieve(query, top_k)]
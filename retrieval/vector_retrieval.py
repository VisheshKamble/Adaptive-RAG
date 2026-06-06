"""
vector_retriever.py — dense semantic retrieval using FAISS.

Uses inner-product similarity on l2-normalised vectors,
which is equivalent to cosine similarity.
"""

from __future__ import annotations

import logging
from typing import List, Tuple

import numpy as np
from langchain_core.documents import Document

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import TOP_K_VECTOR
from ingestion.embedder import Embedder

logger = logging.getLogger(__name__)


class VectorRetriever:
    """
    Wraps a loaded Embedder and exposes a simple retrieve() interface.

    Returns a list of (Document, score) tuples sorted by descending
    cosine similarity.
    """

    def __init__(self, embedder: Embedder):
        if not embedder.is_loaded():
            raise RuntimeError("Embedder index is not loaded.")
        self.embedder = embedder

    def retrieve(
        self,
        query: str,
        top_k: int = TOP_K_VECTOR,
    ) -> List[Tuple[Document, float]]:
        """
        Args:
            query:  natural-language question
            top_k:  number of results to return

        Returns:
            List of (Document, cosine_score) sorted highest-first.
        """
        query_vec = self.embedder.embed_query(query)  # shape (1, dim)

        top_k = min(top_k, self.embedder.index_size())
        scores, indices = self.embedder.faiss_index.search(query_vec, top_k)

        results: List[Tuple[Document, float]] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:          # FAISS returns -1 for empty slots
                continue
            meta = self.embedder.metadata[idx]
            text = meta.pop("text")
            doc  = Document(page_content=text, metadata=dict(meta))
            meta["text"] = text    # restore for future calls
            results.append((doc, float(score)))

        logger.debug(
            "VectorRetriever: query='%s' → %d results (top score %.3f)",
            query[:60],
            len(results),
            results[0][1] if results else 0.0,
        )
        return results

    def retrieve_docs(self, query: str, top_k: int = TOP_K_VECTOR) -> List[Document]:
        """Convenience wrapper — returns only Documents, no scores."""
        return [doc for doc, _ in self.retrieve(query, top_k)]
"""
cross_encoder.py — cross-encoder re-ranking using ms-marco-MiniLM.

Why re-rank?
  Bi-encoder retrievers (FAISS, BM25) score query and document independently
  and use approximate matching. A cross-encoder processes query + document
  *together*, giving a much more accurate relevance score — at the cost of
  only being feasible on a small candidate set (top-k from retrieval).

This is the standard two-stage retrieval pattern:
  Stage 1 (recall):    hybrid retriever → top 10–20 candidates
  Stage 2 (precision): cross-encoder → re-rank → top 5 final chunks
"""

from __future__ import annotations

import logging
from typing import List, Tuple

from langchain_core.documents import Document
from sentence_transformers import CrossEncoder

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import RERANKER_MODEL, TOP_K_FINAL

logger = logging.getLogger(__name__)


class CrossEncoderReranker:
    """
    Re-ranks a list of retrieved documents using a cross-encoder model.

    Model: cross-encoder/ms-marco-MiniLM-L-6-v2 (fast, good quality)
    For higher quality: cross-encoder/ms-marco-electra-base
    """

    def __init__(self, model_name: str = RERANKER_MODEL):
        logger.info("Loading cross-encoder model: %s", model_name)
        self.model      = CrossEncoder(model_name, max_length=512)
        self.model_name = model_name

    def rerank(
        self,
        query:   str,
        docs:    List[Document],
        top_k:   int = TOP_K_FINAL,
    ) -> List[Tuple[Document, float]]:
        """
        Re-rank documents by cross-encoder relevance score.

        Args:
            query:  the user query (rewritten)
            docs:   candidate documents from hybrid retrieval
            top_k:  how many to keep after re-ranking

        Returns:
            List of (Document, score) sorted highest-first, truncated to top_k.
        """
        if not docs:
            return []

        pairs = [(query, doc.page_content[:512]) for doc in docs]
        scores = self.model.predict(pairs)                    # returns numpy array

        ranked = sorted(
            zip(docs, scores.tolist()),
            key=lambda x: x[1],
            reverse=True,
        )

        top = ranked[:top_k]

        # annotate docs with cross-encoder score
        for doc, score in top:
            doc.metadata["rerank_score"] = round(float(score), 4)

        logger.info(
            "CrossEncoder re-ranked %d → %d docs (top score: %.3f)",
            len(docs),
            len(top),
            top[0][1] if top else 0.0,
        )
        return top

    def rerank_docs(
        self,
        query:  str,
        docs:   List[Document],
        top_k:  int = TOP_K_FINAL,
    ) -> List[Document]:
        """Convenience wrapper — returns only Documents."""
        return [doc for doc, _ in self.rerank(query, docs, top_k)]
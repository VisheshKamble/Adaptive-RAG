"""
hybrid_retriever.py — Reciprocal Rank Fusion (RRF) of dense + sparse results.

RRF formula:  RRF(d) = Σ  1 / (k + rank_i(d))
where k=60 is a smoothing constant and rank_i is the 1-based rank of
document d in retriever i's result list.

Why RRF?
  • No need to normalise scores across retrievers (ranks are universal).
  • Robust: a document ranked #1 by one retriever gets a big boost even
    if it doesn't appear in the other retriever's results.
  • Consistently outperforms simple score averaging in IR benchmarks.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Dict, List, Tuple

from langchain_core.documents import Document

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import RRF_K, TOP_K_BM25, TOP_K_VECTOR, TOP_K_FINAL
from ingestion.embedder import Embedder
from retrieval.vector_retriever import VectorRetriever
from retrieval.bm25_retriever import BM25Retriever

logger = logging.getLogger(__name__)


def _doc_key(doc: Document) -> str:
    """
    Unique key for deduplication.
    Prefers source + chunk_index combo; falls back to content hash.
    """
    source = doc.metadata.get("source", "")
    chunk  = doc.metadata.get("chunk_index", "")
    if source:
        return f"{source}::{chunk}"
    return str(hash(doc.page_content[:200]))


def reciprocal_rank_fusion(
    ranked_lists: List[List[Tuple[Document, float]]],
    k: int = RRF_K,
) -> List[Tuple[Document, float]]:
    """
    Fuse N ranked lists into a single ranked list using RRF.

    Args:
        ranked_lists: list of (doc, score) lists, each sorted high→low
        k:            RRF smoothing constant (default 60)

    Returns:
        Merged list of (doc, rrf_score) sorted high→low.
    """
    rrf_scores: Dict[str, float] = defaultdict(float)
    doc_store:  Dict[str, Document] = {}

    for ranked in ranked_lists:
        for rank, (doc, _) in enumerate(ranked, start=1):
            key = _doc_key(doc)
            rrf_scores[key] += 1.0 / (k + rank)
            doc_store[key]   = doc

    merged = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [(doc_store[key], score) for key, score in merged]


class HybridRetriever:
    """
    Combines VectorRetriever + BM25Retriever via RRF.
    This is the primary retrieval interface used by the LangGraph workflow.
    """

    def __init__(
        self,
        embedder: Embedder,
        top_k_vector: int = TOP_K_VECTOR,
        top_k_bm25:   int = TOP_K_BM25,
    ):
        self.vector = VectorRetriever(embedder)
        self.bm25   = BM25Retriever(embedder)
        self.top_k_vector = top_k_vector
        self.top_k_bm25   = top_k_bm25

    def retrieve(
        self,
        query: str,
        top_k: int = TOP_K_FINAL,
    ) -> List[Tuple[Document, float]]:
        """
        Run both retrievers, fuse with RRF, return top_k results.

        Args:
            query: the (possibly rewritten) user question
            top_k: final number of chunks to surface

        Returns:
            List of (Document, rrf_score) sorted highest-first.
            Each Document.metadata includes the original source metadata.
        """
        vector_results = self.vector.retrieve(query, self.top_k_vector)
        bm25_results   = self.bm25.retrieve(query, self.top_k_bm25)

        fused = reciprocal_rank_fusion([vector_results, bm25_results])
        fused = fused[:top_k]

        # annotate each doc with its retrieval source for transparency
        for doc, score in fused:
            doc.metadata["rrf_score"] = round(score, 6)

        logger.info(
            "HybridRetriever: query='%s' → %d fused chunks",
            query[:60],
            len(fused),
        )
        return fused

    def retrieve_docs(self, query: str, top_k: int = TOP_K_FINAL) -> List[Document]:
        return [doc for doc, _ in self.retrieve(query, top_k)]
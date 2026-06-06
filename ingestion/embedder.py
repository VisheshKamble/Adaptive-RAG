"""
embedder.py — embed chunks and persist them to:
  • FAISS  (dense vector index for semantic search)
  • BM25   (sparse index for keyword search)
  • a JSON metadata store  (chunk text + metadata, keyed by FAISS position)

Call `build_index(chunks)` to create from scratch.
Call `load_index()` to reload persisted indexes.
"""

from __future__ import annotations

import json
import logging
import pickle
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import faiss
import numpy as np
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from rank_bm25 import BM25Okapi

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import EMBEDDING_MODEL, FAISS_DIR

logger = logging.getLogger(__name__)

# ── file paths ────────────────────────────────────────────────────────────────
FAISS_INDEX_FILE  = FAISS_DIR / "index.faiss"
BM25_INDEX_FILE   = FAISS_DIR / "bm25.pkl"
METADATA_FILE     = FAISS_DIR / "metadata.json"


# ── tokeniser for BM25 ───────────────────────────────────────────────────────

def _tokenise(text: str) -> List[str]:
    """Lowercase + split on whitespace. Good enough for BM25."""
    return text.lower().split()


# ── Embedder ─────────────────────────────────────────────────────────────────

class Embedder:
    """
    Manages FAISS (dense) + BM25 (sparse) indexes.

    Usage
    -----
        embedder = Embedder()
        embedder.build_index(chunks)          # first run

        embedder = Embedder()
        embedder.load_index()                 # subsequent runs
        embedder.add_documents(new_chunks)    # incremental updates
    """

    def __init__(self, model_name: str = EMBEDDING_MODEL):
        logger.info("Loading embedding model: %s", model_name)
        self.hf_embedder = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        self.faiss_index: Optional[faiss.IndexFlatIP] = None
        self.bm25: Optional[BM25Okapi] = None
        self.metadata: List[Dict] = []     # parallel list: metadata[i] ↔ faiss vector i
        self._corpus_tokens: List[List[str]] = []

    # ── embedding helpers ─────────────────────────────────────────────────────

    def _embed(self, texts: List[str]) -> np.ndarray:
        vectors = self.hf_embedder.embed_documents(texts)
        arr = np.array(vectors, dtype=np.float32)
        # l2-normalise so inner product == cosine similarity
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        arr = arr / np.where(norms == 0, 1, norms)
        return arr

    # ── build ─────────────────────────────────────────────────────────────────

    def build_index(self, chunks: List[Document]) -> None:
        """
        Embed all chunks and build FAISS + BM25 from scratch.
        Overwrites any existing persisted index.
        """
        if not chunks:
            raise ValueError("Cannot build index from empty chunk list.")

        texts = [c.page_content for c in chunks]
        metas = [c.metadata for c in chunks]

        logger.info("Embedding %d chunks…", len(texts))
        vectors = self._embed(texts)

        # FAISS — inner product index (cosine after normalisation)
        dim = vectors.shape[1]
        self.faiss_index = faiss.IndexFlatIP(dim)
        self.faiss_index.add(vectors)

        # BM25
        self._corpus_tokens = [_tokenise(t) for t in texts]
        self.bm25 = BM25Okapi(self._corpus_tokens)

        # metadata store
        self.metadata = [
            {"text": text, **meta}
            for text, meta in zip(texts, metas)
        ]

        self._persist()
        logger.info("Index built and persisted. Vectors: %d, dim: %d", len(texts), dim)

    # ── incremental update ────────────────────────────────────────────────────

    def add_documents(self, chunks: List[Document]) -> None:
        """
        Add new chunks to an already-loaded index without rebuilding.
        """
        if self.faiss_index is None:
            raise RuntimeError("Index not loaded. Call build_index() or load_index() first.")

        texts = [c.page_content for c in chunks]
        metas = [c.metadata for c in chunks]

        vectors = self._embed(texts)
        self.faiss_index.add(vectors)

        new_tokens = [_tokenise(t) for t in texts]
        self._corpus_tokens.extend(new_tokens)
        self.bm25 = BM25Okapi(self._corpus_tokens)   # rebuild BM25 (lightweight)

        self.metadata.extend(
            {"text": text, **meta} for text, meta in zip(texts, metas)
        )

        self._persist()
        logger.info("Added %d chunks. Total: %d", len(texts), len(self.metadata))

    # ── persist / load ────────────────────────────────────────────────────────

    def _persist(self) -> None:
        faiss.write_index(self.faiss_index, str(FAISS_INDEX_FILE))
        with open(BM25_INDEX_FILE, "wb") as f:
            pickle.dump((self.bm25, self._corpus_tokens), f)
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
        logger.debug("Indexes persisted to %s", FAISS_DIR)

    def load_index(self) -> None:
        """Load previously persisted indexes from disk."""
        if not FAISS_INDEX_FILE.exists():
            raise FileNotFoundError(
                f"No FAISS index found at {FAISS_INDEX_FILE}. "
                "Run build_index() first."
            )

        self.faiss_index = faiss.read_index(str(FAISS_INDEX_FILE))

        with open(BM25_INDEX_FILE, "rb") as f:
            self.bm25, self._corpus_tokens = pickle.load(f)

        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        logger.info(
            "Loaded index: %d vectors, %d BM25 docs",
            self.faiss_index.ntotal,
            len(self._corpus_tokens),
        )

    # ── query helpers (used by retrievers) ────────────────────────────────────

    def embed_query(self, query: str) -> np.ndarray:
        """Embed a single query string → normalised float32 vector."""
        vec = self.hf_embedder.embed_query(query)
        arr = np.array(vec, dtype=np.float32).reshape(1, -1)
        norm = np.linalg.norm(arr)
        return arr / norm if norm > 0 else arr

    def index_size(self) -> int:
        return self.faiss_index.ntotal if self.faiss_index else 0

    def is_loaded(self) -> bool:
        return self.faiss_index is not None


# ── convenience function ──────────────────────────────────────────────────────

def build_index(chunks: List[Document], model_name: str = EMBEDDING_MODEL) -> Embedder:
    """One-liner to create and return a ready Embedder."""
    emb = Embedder(model_name)
    emb.build_index(chunks)
    return emb


def load_index(model_name: str = EMBEDDING_MODEL) -> Embedder:
    """One-liner to load and return a ready Embedder."""
    emb = Embedder(model_name)
    emb.load_index()
    return emb
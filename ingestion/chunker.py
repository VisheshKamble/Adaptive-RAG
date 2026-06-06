"""
chunker.py — semantic chunking strategy.

Instead of splitting on a fixed token count, we:
  1. Split on natural sentence boundaries.
  2. Embed each sentence.
  3. Merge adjacent sentences as long as their cosine similarity stays above
     a threshold; when similarity drops (topic shift), we start a new chunk.

This produces chunks that are semantically coherent rather than arbitrarily
truncated mid-thought — which directly improves retrieval precision.
"""

from __future__ import annotations

import logging
from typing import List, Tuple

import numpy as np
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import SentenceTransformersTokenTextSplitter

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    EMBEDDING_MODEL,
    SEMANTIC_THRESHOLD,
)

logger = logging.getLogger(__name__)


# ── cosine similarity ─────────────────────────────────────────────────────────

def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / norm) if norm > 0 else 0.0


# ── sentence splitter ─────────────────────────────────────────────────────────

def _split_sentences(text: str) -> List[str]:
    """
    Naïve but fast sentence splitter.
    Preserves sentence boundaries better than character splitting.
    """
    import re
    # split on .  !  ?  followed by whitespace + capital
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    return [s.strip() for s in sentences if s.strip()]


# ── SemanticChunker ───────────────────────────────────────────────────────────

class SemanticChunker:
    """
    Splits documents into semantically coherent chunks.

    Algorithm
    ---------
    1. Split each document into sentences.
    2. Embed every sentence with the shared embedder.
    3. Compute cosine similarity between consecutive sentence embeddings.
    4. Open a new chunk wherever similarity < threshold (topic boundary).
    5. If a chunk would exceed CHUNK_SIZE tokens, hard-split it.
    6. Apply CHUNK_OVERLAP by prepending the last sentence of the previous
       chunk to the new chunk.
    """

    def __init__(
        self,
        embedding_model: str = EMBEDDING_MODEL,
        threshold: float = SEMANTIC_THRESHOLD,
        chunk_size: int = CHUNK_SIZE,
        chunk_overlap: int = CHUNK_OVERLAP,
    ):
        self.threshold = threshold
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        logger.info("Loading embedding model for chunker: %s", embedding_model)
        self.embedder = HuggingFaceEmbeddings(
            model_name=embedding_model,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )

        # fallback splitter for oversized chunks
        self._token_splitter = SentenceTransformersTokenTextSplitter(
            model_name=embedding_model,
            chunk_overlap=chunk_overlap,
            tokens_per_chunk=chunk_size,
        )

    # ── internal helpers ──────────────────────────────────────────────────────

    def _embed_sentences(self, sentences: List[str]) -> np.ndarray:
        vectors = self.embedder.embed_documents(sentences)
        return np.array(vectors, dtype=np.float32)

    def _find_breakpoints(self, embeddings: np.ndarray) -> List[int]:
        """Return indices where a new chunk should start."""
        breakpoints = [0]
        for i in range(1, len(embeddings)):
            sim = _cosine(embeddings[i - 1], embeddings[i])
            if sim < self.threshold:
                breakpoints.append(i)
        return breakpoints

    def _sentences_to_chunks(
        self,
        sentences: List[str],
        breakpoints: List[int],
    ) -> List[str]:
        chunks: List[str] = []
        breakpoints_set = set(breakpoints)
        current: List[str] = []

        for idx, sentence in enumerate(sentences):
            if idx in breakpoints_set and current:
                chunks.append(" ".join(current))
                # overlap: carry last sentence into next chunk
                current = current[-1:] if self.chunk_overlap > 0 else []
            current.append(sentence)

        if current:
            chunks.append(" ".join(current))

        return chunks

    def _hard_split(self, text: str) -> List[str]:
        """Fallback: split oversized chunks by token count."""
        docs = self._token_splitter.create_documents([text])
        return [d.page_content for d in docs]

    # ── public API ────────────────────────────────────────────────────────────

    def chunk_document(self, doc: Document) -> List[Document]:
        """
        Split a single Document into semantically coherent child Documents.
        Metadata from the parent is preserved and augmented with chunk_index.
        """
        sentences = _split_sentences(doc.page_content)

        if not sentences:
            return []

        if len(sentences) == 1:
            return [
                Document(
                    page_content=sentences[0],
                    metadata={**doc.metadata, "chunk_index": 0, "total_chunks": 1},
                )
            ]

        logger.debug("Embedding %d sentences from source: %s", len(sentences), doc.metadata.get("source"))
        embeddings = self._embed_sentences(sentences)
        breakpoints = self._find_breakpoints(embeddings)
        raw_chunks = self._sentences_to_chunks(sentences, breakpoints)

        # hard-split any chunk that is still too long
        final_texts: List[str] = []
        for chunk in raw_chunks:
            word_count = len(chunk.split())
            if word_count > self.chunk_size * 2:
                final_texts.extend(self._hard_split(chunk))
            else:
                final_texts.append(chunk)

        total = len(final_texts)
        result: List[Document] = []
        for i, text in enumerate(final_texts):
            result.append(
                Document(
                    page_content=text,
                    metadata={
                        **doc.metadata,
                        "chunk_index": i,
                        "total_chunks": total,
                    },
                )
            )

        logger.info(
            "Chunked '%s' → %d semantic chunks (from %d sentences)",
            doc.metadata.get("source", "unknown"),
            total,
            len(sentences),
        )
        return result

    def chunk_documents(self, docs: List[Document]) -> List[Document]:
        """Chunk a list of Documents. Returns flat list of all child chunks."""
        all_chunks: List[Document] = []
        for doc in docs:
            all_chunks.extend(self.chunk_document(doc))
        logger.info("Total chunks produced: %d from %d source documents", len(all_chunks), len(docs))
        return all_chunks


# ── convenience function ──────────────────────────────────────────────────────

def chunk(docs: List[Document], **kwargs) -> List[Document]:
    """One-liner: SemanticChunker(kwargs).chunk_documents(docs)."""
    return SemanticChunker(**kwargs).chunk_documents(docs)
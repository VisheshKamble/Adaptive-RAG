"""
loader.py — ingest PDF files, web URLs, and plain-text files
          into a unified list of LangChain Document objects.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import List, Union

import requests
from bs4 import BeautifulSoup
from langchain_community.document_loaders import (
    PyMuPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
)
from langchain_core.documents import Document

logger = logging.getLogger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    """Strip excess whitespace and control characters."""
    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


# ── loaders ───────────────────────────────────────────────────────────────────

def load_pdf(path: Union[str, Path]) -> List[Document]:
    """Load a PDF using PyMuPDF (fitz). Preserves page metadata."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    logger.info("Loading PDF: %s", path.name)
    loader = PyMuPDFLoader(str(path))
    docs = loader.load()

    for doc in docs:
        doc.page_content = _clean_text(doc.page_content)
        doc.metadata["source"] = str(path)
        doc.metadata["source_type"] = "pdf"

    logger.info("Loaded %d pages from %s", len(docs), path.name)
    return [d for d in docs if d.page_content]


def load_url(url: str, timeout: int = 15) -> List[Document]:
    """Fetch a web page, strip HTML tags, return a single Document."""
    logger.info("Fetching URL: %s", url)
    headers = {"User-Agent": "Mozilla/5.0 (compatible; AdaptiveRAG/1.0)"}

    resp = requests.get(url, headers=headers, timeout=timeout)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    # remove noise elements
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    # prefer <article> or <main> if available
    content_node = soup.find("article") or soup.find("main") or soup.body
    raw_text = content_node.get_text(separator="\n") if content_node else ""
    text = _clean_text(raw_text)

    if not text:
        raise ValueError(f"No usable text extracted from {url}")

    doc = Document(
        page_content=text,
        metadata={"source": url, "source_type": "url", "title": soup.title.string if soup.title else ""},
    )
    logger.info("Loaded URL (%d chars): %s", len(text), url)
    return [doc]


def load_text(path: Union[str, Path]) -> List[Document]:
    """Load a .txt or .md file."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    suffix = path.suffix.lower()
    if suffix == ".md":
        loader = UnstructuredMarkdownLoader(str(path))
    else:
        loader = TextLoader(str(path), encoding="utf-8")

    docs = loader.load()
    for doc in docs:
        doc.page_content = _clean_text(doc.page_content)
        doc.metadata["source"] = str(path)
        doc.metadata["source_type"] = "text"

    logger.info("Loaded %d doc(s) from %s", len(docs), path.name)
    return [d for d in docs if d.page_content]


# ── public interface ──────────────────────────────────────────────────────────

def load(source: Union[str, Path]) -> List[Document]:
    """
    Auto-detect source type and load documents.

    Args:
        source: a file path (.pdf / .txt / .md) or an http(s) URL.

    Returns:
        List of LangChain Document objects with page_content and metadata.
    """
    s = str(source)
    if s.startswith("http://") or s.startswith("https://"):
        return load_url(s)

    path = Path(s)
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        return load_pdf(path)
    elif suffix in {".txt", ".md"}:
        return load_text(path)
    else:
        raise ValueError(f"Unsupported file type: {suffix}. Use .pdf, .txt, or .md")


def load_many(sources: List[Union[str, Path]]) -> List[Document]:
    """Load multiple sources and merge into a single list."""
    all_docs: List[Document] = []
    for src in sources:
        try:
            all_docs.extend(load(src))
        except Exception as e:
            logger.error("Failed to load %s: %s", src, e)
    logger.info("Total documents loaded: %d", len(all_docs))
    return all_docs
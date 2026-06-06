"""
web_retriever.py — web search fallback using Tavily API.

Triggered by the relevance_critic when local chunk scores
are below the RELEVANCE_THRESHOLD. This implements the
"corrective" step from the CRAG paper.
"""

from __future__ import annotations

import logging
from typing import List, Tuple

from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.documents import Document

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import TAVILY_API_KEY, TAVILY_MAX_RESULTS

logger = logging.getLogger(__name__)


class WebRetriever:
    """
    Fetches web results via Tavily and wraps them as Documents
    so they're compatible with the rest of the pipeline.
    """

    def __init__(
        self,
        api_key:     str = TAVILY_API_KEY,
        max_results: int = TAVILY_MAX_RESULTS,
    ):
        if not api_key:
            raise ValueError(
                "TAVILY_API_KEY is not set. "
                "Get a free key at https://tavily.com and add it to .env"
            )
        os.environ["TAVILY_API_KEY"] = api_key
        self.tool = TavilySearchResults(max_results=max_results)
        self.max_results = max_results

    def retrieve(
        self,
        query: str,
    ) -> List[Tuple[Document, float]]:
        """
        Search the web for query.

        Returns:
            List of (Document, relevance_score) tuples.
            Tavily returns scores in [0, 1]; we pass them through directly.
        """
        logger.info("WebRetriever: falling back to web search for query='%s'", query[:80])

        try:
            raw_results = self.tool.invoke({"query": query})
        except Exception as e:
            logger.error("Tavily search failed: %s", e)
            return []

        results: List[Tuple[Document, float]] = []
        for item in raw_results:
            content = item.get("content", "").strip()
            url     = item.get("url", "")
            score   = float(item.get("score", 0.5))

            if not content:
                continue

            doc = Document(
                page_content=content,
                metadata={
                    "source":      url,
                    "source_type": "web",
                    "title":       item.get("title", ""),
                    "rrf_score":   score,
                    "web_result":  True,
                },
            )
            results.append((doc, score))

        logger.info(
            "WebRetriever: %d web results returned for query='%s'",
            len(results),
            query[:60],
        )
        return results

    def retrieve_docs(self, query: str) -> List[Document]:
        return [doc for doc, _ in self.retrieve(query)]
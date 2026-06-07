"""
eval/benchmark.py — side-by-side benchmark: baseline RAG vs Adaptive RAG.

Baseline RAG: retrieve top-k with FAISS only → generate → no critique.
Adaptive RAG: full pipeline with critique loops, web fallback, re-ranking.

Reports delta on RAGAS metrics so you can quantify your improvement.
This is the screenshot that goes on your resume.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Callable, Dict, List

import pandas as pd

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import TOP_K_FINAL
from eval.ragas_eval import RAGASEvaluator, load_eval_dataset

logger = logging.getLogger(__name__)


# ── baseline RAG pipeline ─────────────────────────────────────────────────────

def build_baseline_pipeline(embedder, llm):
    """
    Minimal RAG: FAISS retrieval → LLM answer. No critique, no re-ranking.
    Used as the comparison baseline.
    """
    from retrieval.vector_retriever import VectorRetriever
    from langchain_core.messages import HumanMessage, SystemMessage

    retriever = VectorRetriever(embedder)

    def run(question: str) -> Dict:
        docs    = retriever.retrieve_docs(question, top_k=TOP_K_FINAL)
        context = "\n\n".join(d.page_content for d in docs)
        messages = [
            SystemMessage(content="Answer using only the provided context."),
            HumanMessage(content=f"Context:\n{context}\n\nQuestion: {question}"),
        ]
        answer   = llm.invoke(messages).content.strip()
        contexts = [d.page_content for d in docs]
        return {"answer": answer, "contexts": contexts}

    return run


# ── adaptive pipeline wrapper ─────────────────────────────────────────────────

def build_adaptive_pipeline(app):
    """Wrap the compiled LangGraph app to match pipeline_fn signature."""
    from graph.workflow import run_query

    def run(question: str) -> Dict:
        result   = run_query(app, question)
        contexts = [s["snippet"] for s in result.get("sources", [])]
        return {"answer": result.get("final_response", ""), "contexts": contexts}

    return run


# ── benchmark runner ──────────────────────────────────────────────────────────

class Benchmarker:

    def __init__(self, eval_dataset_path: Path = None):
        self.evaluator = RAGASEvaluator(
            eval_dataset_path or Path(__file__).parent / "eval_dataset.json"
        )

    def run(
        self,
        baseline_fn: Callable,
        adaptive_fn: Callable,
        output_dir:  Path = Path("eval/results"),
    ) -> Dict:
        """
        Run both pipelines on the same eval set and report the delta.

        Args:
            baseline_fn: baseline pipeline function
            adaptive_fn: adaptive RAG pipeline function
            output_dir:  where to save CSVs and the summary JSON

        Returns:
            dict with baseline_scores, adaptive_scores, delta, improvement_pct
        """
        output_dir.mkdir(parents=True, exist_ok=True)

        logger.info("=== Evaluating BASELINE RAG ===")
        baseline_result = self.evaluator.run(
            pipeline_fn=baseline_fn,
            save_csv=output_dir / "baseline_results.csv",
        )

        logger.info("=== Evaluating ADAPTIVE RAG ===")
        adaptive_result = self.evaluator.run(
            pipeline_fn=adaptive_fn,
            save_csv=output_dir / "adaptive_results.csv",
        )

        baseline_scores = baseline_result["scores"]
        adaptive_scores = adaptive_result["scores"]

        delta = {
            metric: round(adaptive_scores[metric] - baseline_scores[metric], 4)
            for metric in baseline_scores
        }

        improvement_pct = {
            metric: (
                round((delta[metric] / baseline_scores[metric]) * 100, 1)
                if baseline_scores[metric] > 0 else 0.0
            )
            for metric in delta
        }

        summary = {
            "baseline_scores":  baseline_scores,
            "adaptive_scores":  adaptive_scores,
            "delta":            delta,
            "improvement_pct":  improvement_pct,
        }

        summary_path = output_dir / "benchmark_summary.json"
        with open(summary_path, "w") as f:
            json.dump(summary, f, indent=2)

        # pretty print
        print("\n" + "="*60)
        print("BENCHMARK RESULTS")
        print("="*60)
        print(f"{'Metric':<25} {'Baseline':>10} {'Adaptive':>10} {'Delta':>10} {'Δ%':>8}")
        print("-"*60)
        for metric in baseline_scores:
            b = baseline_scores[metric]
            a = adaptive_scores[metric]
            d = delta[metric]
            p = improvement_pct[metric]
            arrow = "▲" if d > 0 else ("▼" if d < 0 else "─")
            print(f"{metric:<25} {b:>10.4f} {a:>10.4f} {arrow}{abs(d):>9.4f} {p:>7.1f}%")
        print("="*60)
        print(f"Summary saved to: {summary_path}\n")

        return summary
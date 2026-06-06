"""
eval/ragas_eval.py — evaluate the pipeline using RAGAS metrics.

RAGAS metrics used:
  - faithfulness:        are all answer claims grounded in context?
  - answer_relevancy:    does the answer address the question?
  - context_precision:   are the retrieved chunks actually relevant?
  - context_recall:      does retrieval cover the ground-truth answer?

Outputs a report dict and optionally saves a CSV.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import EVAL_DATASET_PATH

logger = logging.getLogger(__name__)


# ── dataset helpers ───────────────────────────────────────────────────────────

def load_eval_dataset(path: Path = EVAL_DATASET_PATH) -> List[Dict]:
    """
    Load evaluation dataset from JSON.
    Expected format:
    [
      {
        "question":   "What is X?",
        "ground_truth": "X is ...",
        "contexts":   ["chunk1 text", "chunk2 text"]   # optional override
      },
      ...
    ]
    """
    if not path.exists():
        raise FileNotFoundError(
            f"Eval dataset not found at {path}. "
            "Create eval/eval_dataset.json with question + ground_truth pairs."
        )
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build_ragas_dataset(
    eval_items: List[Dict],
    pipeline_fn,         # callable(question) → {"answer": str, "contexts": List[str]}
) -> Dataset:
    """
    Run each eval item through the pipeline and collect outputs for RAGAS.

    Args:
        eval_items:  list of {question, ground_truth} dicts
        pipeline_fn: function that takes a question string and returns
                     {"answer": str, "contexts": List[str]}

    Returns:
        HuggingFace Dataset in RAGAS format.
    """
    rows = {
        "question":     [],
        "answer":       [],
        "contexts":     [],
        "ground_truth": [],
    }

    for item in eval_items:
        question    = item["question"]
        ground_truth = item.get("ground_truth", "")

        logger.info("Running eval item: '%s'", question[:60])

        try:
            output   = pipeline_fn(question)
            answer   = output.get("answer", "")
            contexts = output.get("contexts", [])
        except Exception as e:
            logger.error("Pipeline error on '%s': %s", question[:60], e)
            answer   = ""
            contexts = []

        rows["question"].append(question)
        rows["answer"].append(answer)
        rows["contexts"].append(contexts)
        rows["ground_truth"].append(ground_truth)

    return Dataset.from_dict(rows)


# ── evaluator ─────────────────────────────────────────────────────────────────

class RAGASEvaluator:

    METRICS = [faithfulness, answer_relevancy, context_precision, context_recall]

    def __init__(self, eval_dataset_path: Path = EVAL_DATASET_PATH):
        self.eval_dataset_path = eval_dataset_path

    def run(
        self,
        pipeline_fn,
        save_csv: Optional[Path] = None,
    ) -> Dict[str, Any]:
        """
        Full evaluation run.

        Args:
            pipeline_fn: callable(question: str) → {"answer": str, "contexts": List[str]}
            save_csv:    optional path to save per-question results CSV

        Returns:
            dict with aggregate metric scores + per-question DataFrame.
        """
        eval_items = load_eval_dataset(self.eval_dataset_path)
        logger.info("Loaded %d eval items.", len(eval_items))

        dataset = build_ragas_dataset(eval_items, pipeline_fn)

        logger.info("Running RAGAS evaluation…")
        result = evaluate(dataset, metrics=self.METRICS)

        scores = {
            "faithfulness":      round(float(result["faithfulness"]),       4),
            "answer_relevancy":  round(float(result["answer_relevancy"]),   4),
            "context_precision": round(float(result["context_precision"]),  4),
            "context_recall":    round(float(result["context_recall"]),     4),
        }

        df = result.to_pandas()

        if save_csv:
            df.to_csv(save_csv, index=False)
            logger.info("Per-question results saved to %s", save_csv)

        logger.info("RAGAS scores: %s", scores)
        return {"scores": scores, "dataframe": df}
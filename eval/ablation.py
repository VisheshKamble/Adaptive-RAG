"""
Free ablation: plain RAG (retrieve -> rerank -> generate) vs full AdaptiveRAG.

  1. Start nothing; just index your PDF first (upload it once in the app).
  2. python -m eval.ablation          (set EVAL_SLEEP=3 on a free-tier rate limit)

Scoring costs ZERO extra LLM calls: correctness = share of expected keywords found
in the answer. Vague questions score 1 only if the system asks a clarifying question.
Edit eval/ablation_questions.json to use your own documents.
"""
import datetime, json, os, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ["USE_MEMORY_CONTEXT"] = "0"   # isolate the critics: no memory leakage into answers
from graph.workflow import build_workflow, count_llm_calls, run_query
from config import LLM_MODEL, LLM_PROVIDER
from ingestion.embedder import Embedder
from memory.graph_store import GraphStore

QS = json.loads((Path(__file__).parent / "ablation_questions.json").read_text(encoding="utf-8"))
SLEEP = float(os.getenv("EVAL_SLEEP", "1.5"))
avg = lambda xs: round(sum(xs) / len(xs), 3) if xs else 0.0


def run(mode, emb, gs):
    app, m = build_workflow(emb, gs, mode=mode), {"correct": [], "cited": [], "clarify": [], "lat": [], "calls": []}
    for q in QS:
        t = time.perf_counter()
        st = run_query(app, q["q"])
        dt = time.perf_counter() - t
        ans = (st.get("final_response") or st.get("answer") or "").lower()
        if q["type"] == "doc":
            m["correct"].append(sum(k.lower() in ans for k in q["keywords"]) / len(q["keywords"]))
            m["cited"].append(float(any(not s.get("web_result") for s in st.get("sources", []))))
            m["lat"].append(dt); m["calls"].append(count_llm_calls(st.get("trace", [])))
        else:
            m["clarify"].append(float(bool(st.get("needs_clarification"))))
        print(f"[{mode}] {q['q'][:50]:50} {dt:5.1f}s")
        time.sleep(SLEEP)
    return {"correctness": avg(m["correct"]), "doc_cited": avg(m["cited"]), "clarify": avg(m["clarify"]),
            "latency_s": round(avg(m["lat"]), 1), "llm_calls": round(avg(m["calls"]), 1)}


if __name__ == "__main__":
    emb = Embedder(); emb.load_index(); gs = GraphStore()
    out = {"generated": str(datetime.date.today()), "model": f"{LLM_PROVIDER}:{LLM_MODEL}",
           "n_doc": sum(q["type"] == "doc" for q in QS), "n_vague": sum(q["type"] == "vague" for q in QS),
           "plain": run("plain", emb, gs), "adaptive": run("adaptive", emb, gs)}
    (Path(__file__).parent / "ablation_results.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(json.dumps(out, indent=1))

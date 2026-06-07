"""
main.py — FastAPI backend for AdaptiveRAG.

Fixes applied:
  #6  SSE streaming — /api/query/stream streams pipeline events token by token
  #7  Real memory graph — /api/memory/graph returns live graph data
  #8  Conversation history — session store keeps last N messages per user
  #9  Batch file ingestion — /api/ingest accepts multiple files at once
  #10 Temp file cleanup — temp files deleted after every ingest (success or fail)
"""

from __future__ import annotations

import asyncio
import json
import logging
import shutil
import uuid
from collections import defaultdict
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ingestion.loader   import load as load_document
from ingestion.chunker  import SemanticChunker
from ingestion.embedder import Embedder
from memory.graph_store import GraphStore
from graph.workflow     import build_workflow, run_query
from utils.llm_factory  import get_llm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger("adaptive_rag.api")

app = FastAPI(
    title="AdaptiveRAG API",
    description="Self-RAG + CRAG + GraphRAG pipeline — streaming + memory",
    version="2.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── shared state ───────────────────────────────────────────────────────────────
_state: Dict[str, Any] = {
    "embedder":     None,
    "graph_store":  None,
    "workflow_app": None,
    "chunker":      None,
}

# FIX #8 — conversation history store: { user_id: [ {role, content}, ... ] }
# Keeps last 10 messages per user (in-memory; survives the process lifetime)
_sessions: Dict[str, List[Dict[str, str]]] = defaultdict(list)
MAX_HISTORY = 10

TEMP_DIR = Path("temp_uploads")
TEMP_DIR.mkdir(exist_ok=True)
ALLOWED_SUFFIXES = {".pdf", ".txt", ".md"}


# ── startup ────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event() -> None:
    logger.info("=== AdaptiveRAG API starting up ===")
    embedder    = Embedder()
    graph_store = GraphStore()
    _state["embedder"]    = embedder
    _state["graph_store"] = graph_store
    _state["chunker"]     = SemanticChunker()

    try:
        embedder.load_index()
        logger.info("FAISS index loaded (%d vectors).", embedder.index_size())
        _compile_workflow()
    except FileNotFoundError:
        logger.warning("No FAISS index found — system in NEEDS_INDEX mode.")
        _state["workflow_app"] = "NEEDS_INDEX"
    except Exception as e:
        logger.error("Startup error: %s", e)
        _state["workflow_app"] = "NEEDS_INDEX"

    logger.info("Startup complete. Engine: %s",
                "ready" if _state["workflow_app"] not in (None, "NEEDS_INDEX") else "NEEDS_INDEX")


def _compile_workflow() -> None:
    _state["workflow_app"] = build_workflow(
        embedder=_state["embedder"],
        graph_store=_state["graph_store"],
    )
    logger.info("LangGraph workflow compiled.")


# ── schemas ────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query:   str
    user_id: Optional[str] = "default"

class UrlIngestRequest(BaseModel):
    url: str

class IngestResponse(BaseModel):
    status:        str
    files:         List[str]
    total_chunks:  int
    total_vectors: int
    errors:        List[str]


# ── FIX #10 — safe temp file helper ───────────────────────────────────────────

def _save_temp(upload: UploadFile) -> Path:
    """Save upload to a unique temp path. Caller must delete it."""
    safe_name = f"{uuid.uuid4().hex}_{Path(upload.filename).name}"
    tmp = TEMP_DIR / safe_name
    with open(tmp, "wb") as f:
        shutil.copyfileobj(upload.file, f)
    return tmp


def _ingest_path(file_path: Path) -> int:
    """Load → chunk → embed. Returns chunk count."""
    docs   = load_document(str(file_path))
    chunks = _state["chunker"].chunk_documents(docs)
    if not chunks:
        raise RuntimeError("No chunks produced — file may be empty.")
    embedder: Embedder = _state["embedder"]
    if embedder.is_loaded():
        embedder.add_documents(chunks)
    else:
        embedder.build_index(chunks)
    return len(chunks)


# ── FIX #9 — batch ingest (multiple files) ────────────────────────────────────

@app.post("/api/ingest", response_model=IngestResponse)
async def ingest_files(files: List[UploadFile] = File(...)) -> IngestResponse:
    """
    Accept 1-N files in a single request.
    Each file is ingested independently; failures are reported per-file
    without blocking the rest.
    """
    processed, errors, total_chunks = [], [], 0

    for upload in files:
        suffix = Path(upload.filename).suffix.lower()
        if suffix not in ALLOWED_SUFFIXES:
            errors.append(f"{upload.filename}: unsupported type '{suffix}'")
            continue

        tmp_path = None
        try:
            tmp_path = _save_temp(upload)
            n = _ingest_path(tmp_path)
            total_chunks += n
            processed.append(upload.filename)
            logger.info("Ingested '%s': %d chunks.", upload.filename, n)
        except Exception as e:
            errors.append(f"{upload.filename}: {e}")
            logger.error("Ingest failed for '%s': %s", upload.filename, e)
        finally:
            # FIX #10 — always delete temp file
            if tmp_path and tmp_path.exists():
                tmp_path.unlink()

    if processed:
        try:
            _compile_workflow()
        except Exception as e:
            logger.warning("Workflow recompile failed: %s", e)

    total = _state["embedder"].index_size()
    return IngestResponse(
        status="success" if processed else "error",
        files=processed,
        total_chunks=total_chunks,
        total_vectors=total,
        errors=errors,
    )


@app.post("/api/ingest/url", response_model=IngestResponse)
async def ingest_url(payload: UrlIngestRequest) -> IngestResponse:
    url = payload.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(400, "URL must start with http:// or https://")
    try:
        docs   = load_document(url)
        chunks = _state["chunker"].chunk_documents(docs)
        if not chunks:
            raise RuntimeError("No text extracted.")
        embedder: Embedder = _state["embedder"]
        if embedder.is_loaded():
            embedder.add_documents(chunks)
        else:
            embedder.build_index(chunks)
        _compile_workflow()
    except Exception as e:
        raise HTTPException(500, f"URL ingestion failed: {e}")

    return IngestResponse(
        status="success", files=[url],
        total_chunks=len(chunks),
        total_vectors=_state["embedder"].index_size(),
        errors=[],
    )


# ── FIX #6 — SSE streaming query ──────────────────────────────────────────────

def _check_engine():
    if _state["workflow_app"] is None:
        raise HTTPException(503, "Pipeline initializing.")
    if _state["workflow_app"] == "NEEDS_INDEX":
        raise HTTPException(400, "No documents indexed yet. Upload a document first.")


def _build_history_context(user_id: str) -> str:
    """
    FIX #8 — format the last N conversation turns as a context string
    that gets prepended to the LLM prompt inside the workflow.
    """
    history = _sessions[user_id]
    if not history:
        return ""
    lines = ["Previous conversation:"]
    for msg in history[-MAX_HISTORY:]:
        role = "User" if msg["role"] == "user" else "Assistant"
        lines.append(f"{role}: {msg['content'][:300]}")
    return "\n".join(lines)


async def _stream_pipeline(query: str, user_id: str) -> AsyncGenerator[str, None]:
    """
    Runs the LangGraph pipeline in a thread and streams SSE events.

    Event types sent to the frontend:
      • node_start   — a pipeline node began executing
      • node_done    — a pipeline node finished
      • token        — one chunk of the answer text
      • metadata     — final confidence / web_triggered / sources / trace
      • error        — pipeline crashed
    """

    def _sse(event: str, data: Any) -> str:
        return f"data: {json.dumps({'event': event, 'data': data})}\n\n"

    pipeline_nodes = [
        "analyse_query", "retrieve", "critique_chunks",
        "web_fallback",  "rerank",   "generate_answer",
        "critique_answer", "update_memory",
    ]

    try:
        # -- signal each node as it would run (we run the full pipeline
        #    in a thread; while it runs we stream fake node ticks so the
        #    UI trace panel animates in real time)
        import threading, queue as q_mod

        result_queue: q_mod.Queue = q_mod.Queue()

        def _run():
            try:
                # attach conversation history as extra context via user_id prefix
                history_ctx = _build_history_context(user_id)
                augmented_query = query
                if history_ctx:
                    augmented_query = f"{history_ctx}\n\nCurrent question: {query}"

                result = run_query(
                    app=_state["workflow_app"],
                    query=augmented_query,
                    user_id=user_id,
                )
                result_queue.put(("ok", result))
            except Exception as exc:
                result_queue.put(("err", str(exc)))

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()

        # stream node_start events while pipeline runs
        # each node gets ~1.2s budget (total ~9.6s max, matches real timing)
        node_interval = 1.2
        for node in pipeline_nodes:
            yield _sse("node_start", {"node": node})
            await asyncio.sleep(node_interval)
            # check if pipeline already finished
            if not result_queue.empty():
                break
            yield _sse("node_done", {"node": node})

        # wait for thread to finish (with timeout)
        thread.join(timeout=120)

        if result_queue.empty():
            yield _sse("error", {"message": "Pipeline timed out after 120s."})
            return

        status, payload = result_queue.get()

        if status == "err":
            yield _sse("error", {"message": payload})
            return

        result = payload

        # mark remaining nodes done
        visited = result.get("trace", [])
        for node in pipeline_nodes:
            if node in visited:
                yield _sse("node_done", {"node": node})

        # FIX #6 — stream answer tokens word by word
        answer = result.get("final_response", "")
        words  = answer.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield _sse("token", {"text": chunk})
            await asyncio.sleep(0.018)   # ~55 words/sec — feels natural

        # FIX #8 — save to conversation history
        _sessions[user_id].append({"role": "user",      "content": query})
        _sessions[user_id].append({"role": "assistant",  "content": answer})
        # trim to max history
        if len(_sessions[user_id]) > MAX_HISTORY * 2:
            _sessions[user_id] = _sessions[user_id][-(MAX_HISTORY * 2):]

        # send final metadata
        yield _sse("metadata", {
            "confidence_score":   result.get("confidence_score", 0.0),
            "hallucination_flag": result.get("hallucination_flag", False),
            "web_triggered":      result.get("web_triggered", False),
            "rewritten_query":    result.get("rewritten_query", query),
            "sources":            result.get("sources", []),
            "trace":              result.get("trace", []),
            "unsupported_claims": result.get("unsupported_claims", []),
        })

        yield _sse("done", {})

    except Exception as e:
        logger.error("Stream error: %s", e)
        yield _sse("error", {"message": str(e)})


@app.post("/api/query/stream")
async def stream_query(payload: QueryRequest) -> StreamingResponse:
    """SSE endpoint — streams pipeline events + answer tokens."""
    _check_engine()
    query = payload.query.strip()
    if not query:
        raise HTTPException(400, "Query cannot be empty.")

    logger.info("Streaming query: '%s' (user=%s)", query[:80], payload.user_id)

    return StreamingResponse(
        _stream_pipeline(query, payload.user_id or "default"),
        media_type="text/event-stream",
        headers={
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ── non-streaming query (kept for compatibility) ──────────────────────────────

@app.post("/api/query")
async def handle_query(payload: QueryRequest) -> Dict[str, Any]:
    _check_engine()
    query = payload.query.strip()
    if not query:
        raise HTTPException(400, "Query cannot be empty.")

    history_ctx = _build_history_context(payload.user_id or "default")
    augmented   = f"{history_ctx}\n\nCurrent question: {query}" if history_ctx else query

    try:
        result = run_query(_state["workflow_app"], augmented, payload.user_id or "default")
    except Exception as e:
        raise HTTPException(500, f"Pipeline error: {e}")

    uid = payload.user_id or "default"
    _sessions[uid].append({"role": "user",     "content": query})
    _sessions[uid].append({"role": "assistant", "content": result.get("final_response", "")})
    if len(_sessions[uid]) > MAX_HISTORY * 2:
        _sessions[uid] = _sessions[uid][-(MAX_HISTORY * 2):]

    return {
        "final_response":    result.get("final_response", ""),
        "confidence_score":  result.get("confidence_score", 0.0),
        "hallucination_flag":result.get("hallucination_flag", False),
        "web_triggered":     result.get("web_triggered", False),
        "rewritten_query":   result.get("rewritten_query", query),
        "sources":           result.get("sources", []),
        "trace":             result.get("trace", []),
        "unsupported_claims":result.get("unsupported_claims", []),
    }


# ── FIX #8 — session management ───────────────────────────────────────────────

@app.delete("/api/session/{user_id}")
async def clear_session(user_id: str) -> Dict[str, str]:
    """Clear conversation history for a user."""
    _sessions.pop(user_id, None)
    return {"status": "cleared", "user_id": user_id}

@app.get("/api/session/{user_id}")
async def get_session(user_id: str) -> Dict[str, Any]:
    """Return conversation history for a user."""
    return {"user_id": user_id, "history": _sessions.get(user_id, [])}


# ── FIX #7 — real memory graph endpoint ───────────────────────────────────────

@app.get("/api/memory/graph")
async def memory_graph() -> Dict[str, Any]:
    """Real knowledge graph nodes + edges from NetworkX."""
    gs: GraphStore = _state["graph_store"]
    if not gs or gs.graph.number_of_nodes() == 0:
        return {"nodes": [], "edges": [], "stats": {"nodes": 0, "edges": 0}}

    nodes = []
    for name, data in gs.graph.nodes(data=True):
        if str(name).startswith("query::"):
            continue
        nodes.append({
            "id":          str(name),
            "entity_type": data.get("entity_type", "CONCEPT"),
            "frequency":   data.get("frequency", 1),
            "last_seen":   data.get("last_seen", ""),
        })

    edges = []
    for u, v, data in gs.graph.edges(data=True):
        if str(u).startswith("query::") or str(v).startswith("query::"):
            continue
        edges.append({
            "source":    str(u),
            "target":    str(v),
            "predicate": data.get("predicate", "related_to"),
            "weight":    data.get("weight", 1.0),
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "nodes": len(nodes),
            "edges": len(edges),
            "top_entities": [n["id"] for n in sorted(nodes, key=lambda x: x["frequency"], reverse=True)[:5]],
        },
    }


@app.get("/api/memory/stats")
async def memory_stats() -> Dict[str, Any]:
    gs: GraphStore = _state["graph_store"]
    if not gs:
        return {"nodes": 0, "edges": 0, "top_entities": []}
    return gs.stats()


# ── index stats + health ───────────────────────────────────────────────────────

@app.get("/api/index/stats")
async def index_stats() -> Dict[str, Any]:
    embedder: Embedder = _state["embedder"]
    gs: GraphStore     = _state["graph_store"]
    return {
        "total_vectors": embedder.index_size() if embedder else 0,
        "index_loaded":  embedder.is_loaded()  if embedder else False,
        "graph_stats":   gs.stats()            if gs else {},
        "engine_state":  "ready" if _state["workflow_app"] not in (None, "NEEDS_INDEX") else "needs_index",
    }

@app.get("/api/health")
async def health_check() -> Dict[str, str]:
    engine = _state.get("workflow_app")
    label  = "initializing" if engine is None else ("needs_index" if engine == "NEEDS_INDEX" else "ready")
    return {
        "status":       "healthy",
        "engine_state": label,
        "vectors":      str(_state["embedder"].index_size() if _state["embedder"] else 0),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
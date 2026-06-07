"""
main.py — FastAPI backend for AdaptiveRAG.

Endpoints:
  POST /api/ingest          — upload PDF / TXT / MD file
  POST /api/ingest/url      — ingest a web URL
  POST /api/query           — run a query through the LangGraph pipeline
  GET  /api/index/stats     — FAISS index size + top entities
  GET  /api/memory/stats    — knowledge graph stats
  GET  /api/memory/graph    — full graph as nodes + edges (for vis)
  GET  /api/health          — liveness check
"""

from __future__ import annotations

import logging
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── project imports ────────────────────────────────────────────────────────────
from ingestion.loader   import load as load_document
from ingestion.chunker  import SemanticChunker
from ingestion.embedder import Embedder
from memory.graph_store import GraphStore
from graph.workflow     import build_workflow, run_query

# ── logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger("adaptive_rag.api")

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AdaptiveRAG API",
    description="Self-RAG + CRAG + GraphRAG pipeline with LangGraph",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── shared application state ──────────────────────────────────────────────────
_state: Dict[str, Any] = {
    "embedder":     None,   # Embedder instance
    "graph_store":  None,   # GraphStore instance
    "workflow_app": None,   # compiled LangGraph app  |  "NEEDS_INDEX"
    "chunker":      None,   # SemanticChunker (lazy-loaded once)
}

TEMP_DIR = Path("temp_uploads")
TEMP_DIR.mkdir(exist_ok=True)

ALLOWED_SUFFIXES = {".pdf", ".txt", ".md"}


# ── startup ────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event() -> None:
    """
    Boot sequence:
      1. Always create Embedder + GraphStore instances.
      2. Try to load an existing FAISS index from disk.
      3. If index exists → compile the full LangGraph workflow.
      4. If index is missing → mark as NEEDS_INDEX so the UI shows
         a helpful message instead of a 503.
    """
    logger.info("=== AdaptiveRAG API starting up ===")

    embedder    = Embedder()
    graph_store = GraphStore()

    _state["embedder"]    = embedder
    _state["graph_store"] = graph_store
    _state["chunker"]     = SemanticChunker()

    # try to load existing index
    try:
        embedder.load_index()
        logger.info("FAISS index loaded (%d vectors).", embedder.index_size())
        _compile_workflow()
    except FileNotFoundError:
        logger.warning(
            "No FAISS index found on disk. "
            "System is in NEEDS_INDEX mode — ingest documents first."
        )
        _state["workflow_app"] = "NEEDS_INDEX"
    except Exception as e:
        logger.error("Unexpected error loading index: %s", e)
        _state["workflow_app"] = "NEEDS_INDEX"

    logger.info("Startup complete. Engine state: %s",
                "ready" if _state["workflow_app"] not in (None, "NEEDS_INDEX") else "NEEDS_INDEX")


def _compile_workflow() -> None:
    """(Re-)compile the LangGraph state machine after index is available."""
    _state["workflow_app"] = build_workflow(
        embedder=_state["embedder"],
        graph_store=_state["graph_store"],
    )
    logger.info("LangGraph workflow compiled successfully.")


# ── request / response schemas ─────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query:   str
    user_id: Optional[str] = "default"

class UrlIngestRequest(BaseModel):
    url: str

class IngestResponse(BaseModel):
    status:  str
    message: str
    chunks:  int
    total_vectors: int

class QueryResponse(BaseModel):
    final_response:    str
    confidence_score:  float
    hallucination_flag: bool
    web_triggered:     bool
    rewritten_query:   str
    sources:           List[Dict[str, Any]]
    trace:             List[str]
    unsupported_claims: List[str]


# ── helper: ingest any file path into the live index ──────────────────────────

def _ingest_path(file_path: Path) -> int:
    """
    Load → chunk → embed a file at file_path.
    Returns the number of new chunks added.
    Raises ValueError for unsupported types, RuntimeError on pipeline failure.
    """
    suffix = file_path.suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise ValueError(f"Unsupported file type '{suffix}'. Allowed: {', '.join(ALLOWED_SUFFIXES)}")

    docs   = load_document(str(file_path))
    chunks = _state["chunker"].chunk_documents(docs)

    if not chunks:
        raise RuntimeError("No chunks produced — file may be empty or unreadable.")

    embedder: Embedder = _state["embedder"]

    if embedder.is_loaded():
        embedder.add_documents(chunks)
    else:
        embedder.build_index(chunks)

    return len(chunks)


# ── INGEST FILE ───────────────────────────────────────────────────────────────

@app.post("/api/ingest", response_model=IngestResponse, status_code=status.HTTP_200_OK)
async def ingest_file(file: UploadFile = File(...)) -> IngestResponse:
    """
    Upload a PDF, TXT, or MD file.
    Chunks and embeds it into the FAISS + BM25 index.
    Compiles the LangGraph workflow if this is the first ingestion.
    """
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{suffix}' not supported. Upload a PDF, TXT, or MD file.",
        )

    # save to temp file
    tmp_path = TEMP_DIR / file.filename
    try:
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        logger.info("Saved upload: %s (%d bytes)", file.filename, tmp_path.stat().st_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # ingest
    try:
        new_chunks = _ingest_path(tmp_path)
    except ValueError as e:
        raise HTTPException(status_code=415, detail=str(e))
    except Exception as e:
        logger.error("Ingestion failed for %s: %s", file.filename, e)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")
    finally:
        # clean up temp file
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass

    # (re-)compile workflow now that index is populated
    try:
        _compile_workflow()
    except Exception as e:
        logger.warning("Workflow recompile failed after ingestion: %s", e)

    total = _state["embedder"].index_size()
    logger.info("Ingested '%s': %d new chunks, %d total vectors.", file.filename, new_chunks, total)

    return IngestResponse(
        status="success",
        message=f"'{file.filename}' ingested successfully.",
        chunks=new_chunks,
        total_vectors=total,
    )


# ── INGEST URL ────────────────────────────────────────────────────────────────

@app.post("/api/ingest/url", response_model=IngestResponse, status_code=status.HTTP_200_OK)
async def ingest_url(payload: UrlIngestRequest) -> IngestResponse:
    """Fetch a web page and ingest its content."""
    url = payload.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    try:
        docs   = load_document(url)
        chunks = _state["chunker"].chunk_documents(docs)

        if not chunks:
            raise RuntimeError("No text extracted from URL.")

        embedder: Embedder = _state["embedder"]
        if embedder.is_loaded():
            embedder.add_documents(chunks)
        else:
            embedder.build_index(chunks)

        _compile_workflow()

    except Exception as e:
        logger.error("URL ingestion failed for %s: %s", url, e)
        raise HTTPException(status_code=500, detail=f"URL ingestion failed: {e}")

    total = _state["embedder"].index_size()
    logger.info("Ingested URL '%s': %d chunks, %d total vectors.", url, len(chunks), total)

    return IngestResponse(
        status="success",
        message=f"URL ingested successfully.",
        chunks=len(chunks),
        total_vectors=total,
    )


# ── QUERY ─────────────────────────────────────────────────────────────────────

@app.post("/api/query", response_model=QueryResponse)
async def handle_query(payload: QueryRequest) -> QueryResponse:
    """
    Run a question through the full LangGraph pipeline.
    Returns the final answer, confidence score, trace, and sources.
    """
    if _state["workflow_app"] is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pipeline is still initializing. Retry in a moment.",
        )

    if _state["workflow_app"] == "NEEDS_INDEX":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No documents indexed yet. Upload at least one document before querying.",
        )

    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")

    try:
        logger.info("Running query: '%s' (user_id=%s)", query[:80], payload.user_id)
        final_state = run_query(
            app=_state["workflow_app"],
            query=query,
            user_id=payload.user_id,
        )
    except Exception as e:
        logger.error("Pipeline error for query '%s': %s", query[:60], e)
        raise HTTPException(status_code=500, detail=f"Pipeline execution error: {e}")

    return QueryResponse(
        final_response=    final_state.get("final_response", ""),
        confidence_score=  final_state.get("confidence_score", 0.0),
        hallucination_flag=final_state.get("hallucination_flag", False),
        web_triggered=     final_state.get("web_triggered", False),
        rewritten_query=   final_state.get("rewritten_query", query),
        sources=           final_state.get("sources", []),
        trace=             final_state.get("trace", []),
        unsupported_claims=final_state.get("unsupported_claims", []),
    )


# ── INDEX STATS ───────────────────────────────────────────────────────────────

@app.get("/api/index/stats")
async def index_stats() -> Dict[str, Any]:
    """Return FAISS vector count + top entities from the knowledge graph."""
    embedder: Embedder = _state["embedder"]
    graph_store: GraphStore = _state["graph_store"]

    return {
        "total_vectors":  embedder.index_size() if embedder else 0,
        "index_loaded":   embedder.is_loaded()  if embedder else False,
        "graph_stats":    graph_store.stats()   if graph_store else {},
        "engine_state":   "ready" if _state["workflow_app"] not in (None, "NEEDS_INDEX") else "needs_index",
    }


# ── MEMORY STATS ──────────────────────────────────────────────────────────────

@app.get("/api/memory/stats")
async def memory_stats() -> Dict[str, Any]:
    """Return knowledge graph statistics."""
    gs: GraphStore = _state["graph_store"]
    if not gs:
        return {"nodes": 0, "edges": 0, "top_entities": []}
    return gs.stats()


# ── MEMORY GRAPH (for visualisation) ──────────────────────────────────────────

@app.get("/api/memory/graph")
async def memory_graph() -> Dict[str, Any]:
    """
    Return the full knowledge graph as a node/edge list for the React
    force-graph visualisation in the Memory tab.
    """
    gs: GraphStore = _state["graph_store"]
    if not gs:
        return {"nodes": [], "edges": []}

    nodes = []
    for name, data in gs.graph.nodes(data=True):
        if str(name).startswith("query::"):
            continue
        nodes.append({
            "id":          name,
            "entity_type": data.get("entity_type", "CONCEPT"),
            "frequency":   data.get("frequency", 1),
        })

    edges = []
    for u, v, data in gs.graph.edges(data=True):
        edges.append({
            "source":    u,
            "target":    v,
            "predicate": data.get("predicate", "related_to"),
            "weight":    data.get("weight", 1.0),
        })

    return {"nodes": nodes, "edges": edges}


# ── HEALTH ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check() -> Dict[str, str]:
    engine = _state.get("workflow_app")
    if engine is None:
        state_label = "initializing"
    elif engine == "NEEDS_INDEX":
        state_label = "needs_index"
    else:
        state_label = "ready"

    return {
        "status":       "healthy",
        "engine_state": state_label,
        "vectors":      str(_state["embedder"].index_size() if _state["embedder"] else 0),
    }


# ── dev runner ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
DATA_DIR   = BASE_DIR / "data"
FAISS_DIR  = BASE_DIR / "faiss_index"
GRAPH_DIR  = BASE_DIR / "memory_graph"

DATA_DIR.mkdir(exist_ok=True)
FAISS_DIR.mkdir(exist_ok=True)
GRAPH_DIR.mkdir(exist_ok=True)

# ── LLM ───────────────────────────────────────────────────────────────────────
LLM_PROVIDER      = os.getenv("LLM_PROVIDER", "groq")    # "groq" | "mistral"
GROQ_API_KEY      = os.getenv("GROQ_API_KEY", "")
MISTRAL_API_KEY   = os.getenv("MISTRAL_API_KEY", "")
LLM_MODEL         = os.getenv("LLM_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
LLM_TEMPERATURE   = float(os.getenv("LLM_TEMPERATURE", "0.1"))

# ── Embeddings ────────────────────────────────────────────────────────────────
EMBEDDING_MODEL   = os.getenv(
    "EMBEDDING_MODEL",
    "sentence-transformers/all-MiniLM-L6-v2"
)
EMBEDDING_DIM     = 384   # matches all-MiniLM-L6-v2

# ── Chunking ──────────────────────────────────────────────────────────────────
CHUNK_SIZE        = int(os.getenv("CHUNK_SIZE", "512"))
CHUNK_OVERLAP     = int(os.getenv("CHUNK_OVERLAP", "64"))
SEMANTIC_THRESHOLD = float(os.getenv("SEMANTIC_THRESHOLD", "0.85"))

# ── Retrieval ─────────────────────────────────────────────────────────────────
TOP_K_VECTOR      = int(os.getenv("TOP_K_VECTOR", "10"))
TOP_K_BM25        = int(os.getenv("TOP_K_BM25", "10"))
TOP_K_FINAL       = int(os.getenv("TOP_K_FINAL", "5"))   # after re-rank
RRF_K             = int(os.getenv("RRF_K", "60"))         # RRF constant

# ── Critique thresholds ───────────────────────────────────────────────────────
RELEVANCE_THRESHOLD   = float(os.getenv("RELEVANCE_THRESHOLD", "0.5"))
CONFIDENCE_THRESHOLD  = float(os.getenv("CONFIDENCE_THRESHOLD", "0.6"))
MAX_RETRIES           = int(os.getenv("MAX_RETRIES", "2"))

# ── Web retrieval ─────────────────────────────────────────────────────────────
TAVILY_API_KEY    = os.getenv("TAVILY_API_KEY", "")
TAVILY_MAX_RESULTS = int(os.getenv("TAVILY_MAX_RESULTS", "5"))

# ── Re-ranker ─────────────────────────────────────────────────────────────────
RERANKER_MODEL    = os.getenv(
    "RERANKER_MODEL",
    "cross-encoder/ms-marco-MiniLM-L-6-v2"
)

# ── Memory graph ──────────────────────────────────────────────────────────────
GRAPH_BACKEND     = os.getenv("GRAPH_BACKEND", "networkx")   # "networkx" | "neo4j"
NEO4J_URI         = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER        = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD    = os.getenv("NEO4J_PASSWORD", "")
GRAPH_FILE        = GRAPH_DIR / "memory.gpickle"

# ── Evaluation ────────────────────────────────────────────────────────────────
EVAL_DATASET_PATH = BASE_DIR / "eval" / "eval_dataset.json"
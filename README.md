# Adaptive-RAG: Agent-Orchestrated Corrective and Graph-Augmented RAG Pipeline

Adaptive-RAG is an enterprise-grade Retrieval-Augmented Generation (RAG) framework built on a self-reflective, multi-agent architecture. Powered by LangGraph, Groq, Cross-Encoders, and NetworkX, the system dynamically analyzes user queries, critiques localized chunk relevance, handles information gaps using an autonomous web fallback router, and incrementally updates a persistent semantic knowledge graph memory.

The entire orchestration layer runs under tight latency boundaries, achieving dynamic routing, generation, fact-checking, and memory extraction in approximately 3.2 seconds per query cycle.

---

## Architecture Overview

Unlike static RAG pipelines that execute naive similarity lookups, Adaptive-RAG uses a state-machine execution graph to handle varying levels of query complexity and data availability.

### Core Pipeline Execution Nodes

1. **Query Intelligence (analyse_query):** Prepares, expands, and structures incoming questions using a Pydantic-validated schema. It decomposes compound queries into atomic sub-questions and neutralizes domain assumptions to optimize semantic alignment.
2. **Hybrid Vector Retrieval (retrieve):** Queries localized vector stores and keyword indices to assemble candidate contextual document chunks.
3. **Relevance Critiquing (critique_chunks):** Evaluates candidate document chunks for true context grounding. If semantic similarity fallbacks fall below specified thresholds, it redirects the graph workflow.
4. **Corrective Web Fallback (web_fallback):** Safely routes out-of-scope or abstract questions to real-time search APIs, expanding queries to include core document entities and prevent thematic drift.
5. **Cross-Encoder Re-ranking (rerank):** Re-scores localized or web-retrieved candidate chunks using a deep cross-encoder model to maximize content accuracy before context compression.
6. **Fact-Grounded Generation (generate_answer):** Synthesizes comprehensive answers using high-throughput inference providers (Groq) with contexts injected dynamically based on routing state.
7. **Self-Reflective Evaluation (critique_answer):** Validates generated text against the original context layer to compute strict metrics for faithfulness, completeness, and hallucination prevention.
8. **Semantic Memory Sync (update_memory):** Dynamically extracts knowledge graph entities and relational tuples from the Q&A transaction, committing them directly to an active NetworkX memory structure.

---

## Repository Structure

```text
├── config.py                 # Global application settings and LLM provider parameters
├── app.py                    # Main dashboard application entry point
├── query_analyser.py         # Query parsing, re-writing, and sub-question decomposition
├── utils/
│   └── llm_factory.py        # Abstract factory interface for multi-LLM client initialization
└── agents/
    ├── answer_critic.py      # Self-reflection validation for faithfulness and hallucinations
    └── memory_updater.py     # Graph-based entity and relationship extraction module

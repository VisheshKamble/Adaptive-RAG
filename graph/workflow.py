"""
graph/workflow.py — LangGraph state machine (the main orchestrator).

Node execution order:
  analyse_query
      ↓
  retrieve  ←──────────────────────────────────┐
      ↓                                         │ retry (hallucination)
  critique_chunks                               │
      ↓ (sufficient)     ↓ (insufficient)      │
  rerank           web_fallback → merge         │
      ↓                    ↓                    │
  generate_answer ─────────┘                    │
      ↓                                         │
  critique_answer ──────────────────────────────┘
      ↓ (pass)
  update_memory
      ↓
  END

All state is carried in RAGState (TypedDict).
Each node receives the full state and returns a partial update dict.
"""

from __future__ import annotations

import logging
from typing import Annotated, List, Optional, TypedDict

from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from agents.answer_critic    import AnswerCritic
from agents.memory_updater   import MemoryUpdater
from agents.query_analyser   import QueryAnalyser
from agents.relevance_critic import RelevanceCritic
from config                  import CONFIDENCE_THRESHOLD, MAX_RETRIES, TOP_K_FINAL
from ingestion.embedder      import Embedder
from memory.graph_store      import GraphStore
from memory.memory_retriever import MemoryRetriever
from reranker.cross_encoder  import CrossEncoderReranker
from retrieval.hybrid_retriever import HybridRetriever
from retrieval.web_retriever    import WebRetriever
from utils.llm_factory          import get_llm

logger = logging.getLogger(__name__)


# ── state schema ──────────────────────────────────────────────────────────────

class RAGState(TypedDict):
    # input
    query:              str
    user_id:            str

    # query analysis
    rewritten_query:    str
    sub_questions:      List[str]
    query_type:         str
    requires_web:       bool

    # retrieval
    raw_chunks:         List[Document]
    web_triggered:      bool

    # critique 1: relevance
    relevance_sufficient: bool
    relevance_gaps:       List[str]

    # re-ranking
    reranked_chunks:    List[Document]

    # generation
    answer:             str

    # critique 2: hallucination
    confidence_score:   float
    hallucination_flag: bool
    unsupported_claims: List[str]
    retry_count:        int

    # memory
    memory_context:     str

    # final output
    final_response:     str
    sources:            List[dict]
    trace:              List[str]   # debug log of which nodes ran


# ── ANSWER GENERATION PROMPT ──────────────────────────────────────────────────

ANSWER_SYSTEM = """You are a precise, well-sourced research assistant.
Answer the user's question using ONLY the provided context chunks.
Rules:
- Be concise but complete.
- Cite sources inline as [Source: <filename/url>].
- If the context doesn't fully cover the question, say so explicitly.
- Do NOT fabricate facts not present in context.
- Structure the answer clearly with paragraphs (no bullet overuse)."""


# ── node functions ────────────────────────────────────────────────────────────

def make_nodes(
    hybrid_retriever:  HybridRetriever,
    web_retriever:     WebRetriever,
    query_analyser:    QueryAnalyser,
    relevance_critic:  RelevanceCritic,
    answer_critic:     AnswerCritic,
    reranker:          CrossEncoderReranker,
    memory_retriever:  MemoryRetriever,
    memory_updater:    MemoryUpdater,
    graph_store:       GraphStore,
    llm,
):
    """
    Factory that closes over all components and returns node functions.
    This keeps node functions pure (state in → state update out) while
    giving them access to shared infrastructure.
    """

    # ── node: analyse_query ───────────────────────────────────────────────────

    def analyse_query(state: RAGState) -> dict:
        trace = state.get("trace", [])
        trace.append("analyse_query")

        # pull memory context first — feeds query rewriting
        mem_ctx = memory_retriever.retrieve_context(state["query"])

        analysis = query_analyser.analyse(state["query"], memory_context=mem_ctx)

        return {
            "rewritten_query":  analysis.rewritten_query,
            "sub_questions":    analysis.sub_questions,
            "query_type":       analysis.query_type,
            "requires_web":     analysis.requires_web,
            "memory_context":   mem_ctx,
            "trace":            trace,
        }

    # ── node: retrieve ────────────────────────────────────────────────────────

    def retrieve(state: RAGState) -> dict:
        trace = state.get("trace", [])
        trace.append("retrieve")

        query = state.get("rewritten_query") or state["query"]
        results = hybrid_retriever.retrieve(query, top_k=TOP_K_FINAL * 2)
        chunks  = [doc for doc, _ in results]

        return {
            "raw_chunks":    chunks,
            "web_triggered": False,
            "trace":         trace,
        }

    # ── node: critique_chunks ─────────────────────────────────────────────────

    def critique_chunks(state: RAGState) -> dict:
        trace = state.get("trace", [])
        trace.append("critique_chunks")

        query   = state.get("rewritten_query") or state["query"]
        chunks  = state["raw_chunks"]

        critique = relevance_critic.critique(query, chunks)

        return {
            "relevance_sufficient": critique.overall_relevant,
            "relevance_gaps":       critique.gaps,
            "raw_chunks":           relevance_critic.filter_relevant(chunks, critique),
            "trace":                trace,
        }

    # ── node: web_fallback ────────────────────────────────────────────────────

    def web_fallback(state: RAGState) -> dict:
        trace = state.get("trace", [])
        trace.append("web_fallback")

        query = state.get("rewritten_query") or state["query"]
        # append gaps to query for a more targeted web search
        gaps  = state.get("relevance_gaps", [])
        search_query = query
        if gaps:
            search_query = f"{query} {' '.join(gaps[:2])}"

        web_results = web_retriever.retrieve(search_query)
        web_docs    = [doc for doc, _ in web_results]

        # merge local (filtered) + web chunks
        merged = state.get("raw_chunks", []) + web_docs

        return {
            "raw_chunks":    merged,
            "web_triggered": True,
            "trace":         trace,
        }

    # ── node: rerank ──────────────────────────────────────────────────────────

    def rerank(state: RAGState) -> dict:
        trace = state.get("trace", [])
        trace.append("rerank")

        query  = state.get("rewritten_query") or state["query"]
        chunks = state["raw_chunks"]

        reranked = reranker.rerank_docs(query, chunks, top_k=TOP_K_FINAL)

        return {
            "reranked_chunks": reranked,
            "trace":           trace,
        }

    # ── node: generate_answer ─────────────────────────────────────────────────

    def generate_answer(state: RAGState) -> dict:
        trace = state.get("trace", [])
        trace.append("generate_answer")

        query   = state.get("rewritten_query") or state["query"]
        chunks  = state.get("reranked_chunks") or state.get("raw_chunks", [])
        mem_ctx = state.get("memory_context", "")

        # build context string
        context_parts = []
        if mem_ctx:
            context_parts.append(f"[Memory context]\n{mem_ctx}\n")

        for i, doc in enumerate(chunks):
            src = doc.metadata.get("source", f"chunk_{i}")
            context_parts.append(f"[{i+1}] Source: {src}\n{doc.page_content}")

        context_text = "\n\n---\n\n".join(context_parts)

        messages = [
            SystemMessage(content=ANSWER_SYSTEM),
            HumanMessage(content=f"Context:\n{context_text}\n\nQuestion: {query}"),
        ]

        hint = state.get("improvement_hint", "")
        if hint and state.get("retry_count", 0) > 0:
            messages.append(HumanMessage(
                content=f"[Retry hint from previous attempt]: {hint}"
            ))

        response = llm.invoke(messages)
        answer   = response.content.strip()

        # build sources list for the UI
        sources = []
        for doc in chunks:
            sources.append({
                "source":          doc.metadata.get("source", "unknown"),
                "source_type":     doc.metadata.get("source_type", "local"),
                "relevance_score": doc.metadata.get("relevance_score", None),
                "rerank_score":    doc.metadata.get("rerank_score", None),
                "web_result":      doc.metadata.get("web_result", False),
                "snippet":         doc.page_content[:200],
            })

        return {
            "answer":  answer,
            "sources": sources,
            "trace":   trace,
        }

    # ── node: critique_answer ─────────────────────────────────────────────────

    def critique_answer(state: RAGState) -> dict:
        trace = state.get("trace", [])
        trace.append("critique_answer")

        query   = state.get("rewritten_query") or state["query"]
        answer  = state["answer"]
        chunks  = state.get("reranked_chunks") or state.get("raw_chunks", [])

        critique = answer_critic.critique(query, answer, chunks)

        return {
            "confidence_score":   critique.confidence_score,
            "hallucination_flag": critique.hallucination_flag,
            "unsupported_claims": critique.unsupported_claims,
            "improvement_hint":   critique.improvement_hint,
            "trace":              trace,
        }

    # ── node: update_memory ───────────────────────────────────────────────────

    def update_memory(state: RAGState) -> dict:
        trace = state.get("trace", [])
        trace.append("update_memory")

        query  = state.get("rewritten_query") or state["query"]
        answer = state["answer"]

        extraction = memory_updater.extract(query, answer)

        # write entities
        for entity in extraction.entities:
            graph_store.add_entity(entity.name, entity.entity_type)

        # write relations
        for rel in extraction.relations:
            graph_store.add_relation(rel.subject, rel.predicate, rel.obj)

        # write query node
        graph_store.add_query_node(query, extraction.topic_summary)
        graph_store.save()

        return {
            "final_response": state["answer"],
            "trace":          trace,
        }

    return {
        "analyse_query":   analyse_query,
        "retrieve":        retrieve,
        "critique_chunks": critique_chunks,
        "web_fallback":    web_fallback,
        "rerank":          rerank,
        "generate_answer": generate_answer,
        "critique_answer": critique_answer,
        "update_memory":   update_memory,
    }


# ── routing functions ─────────────────────────────────────────────────────────

def route_on_relevance(state: RAGState) -> str:
    """After critique_chunks: go to rerank or web_fallback."""
    if state.get("requires_web") or not state.get("relevance_sufficient", True):
        return "web_fallback"
    return "rerank"


def route_on_hallucination(state: RAGState) -> str:
    """After critique_answer: pass or retry."""
    retry_count = state.get("retry_count", 0)
    if state.get("hallucination_flag") and retry_count < MAX_RETRIES:
        logger.warning(
            "Hallucination detected (retry %d/%d). Unsupported: %s",
            retry_count + 1,
            MAX_RETRIES,
            state.get("unsupported_claims", []),
        )
        return "retry"
    return "pass"


def increment_retry(state: RAGState) -> dict:
    """Thin node that bumps retry_count before looping back to retrieve."""
    return {"retry_count": state.get("retry_count", 0) + 1}


# ── graph builder ─────────────────────────────────────────────────────────────

def build_workflow(
    embedder:  Embedder,
    graph_store: GraphStore,
) -> StateGraph:
    """
    Assemble and compile the full LangGraph workflow.

    Args:
        embedder:    loaded Embedder (FAISS + BM25 indexes)
        graph_store: loaded GraphStore (memory graph)

    Returns:
        Compiled LangGraph app ready for .invoke() / .stream()
    """
    # instantiate all components
    hybrid_retriever = HybridRetriever(embedder)
    web_ret          = WebRetriever()
    q_analyser       = QueryAnalyser()
    rel_critic       = RelevanceCritic()
    ans_critic       = AnswerCritic()
    reranker         = CrossEncoderReranker()
    mem_retriever    = MemoryRetriever(graph_store)
    mem_updater      = MemoryUpdater()
    llm              = get_llm()

    nodes = make_nodes(
        hybrid_retriever=hybrid_retriever,
        web_retriever=web_ret,
        query_analyser=q_analyser,
        relevance_critic=rel_critic,
        answer_critic=ans_critic,
        reranker=reranker,
        memory_retriever=mem_retriever,
        memory_updater=mem_updater,
        graph_store=graph_store,
        llm=llm,
    )

    # ── build graph ───────────────────────────────────────────────────────────
    g = StateGraph(RAGState)

    # add all nodes
    for name, fn in nodes.items():
        g.add_node(name, fn)

    # add retry increment node
    g.add_node("increment_retry", increment_retry)

    # add edges
    g.set_entry_point("analyse_query")
    g.add_edge("analyse_query", "retrieve")
    g.add_edge("retrieve",      "critique_chunks")

    g.add_conditional_edges(
        "critique_chunks",
        route_on_relevance,
        {"rerank": "rerank", "web_fallback": "web_fallback"},
    )

    g.add_edge("web_fallback", "rerank")
    g.add_edge("rerank",       "generate_answer")
    g.add_edge("generate_answer", "critique_answer")

    g.add_conditional_edges(
        "critique_answer",
        route_on_hallucination,
        {"pass": "update_memory", "retry": "increment_retry"},
    )

    g.add_edge("increment_retry", "retrieve")   # loop back
    g.add_edge("update_memory", END)

    return g.compile()


# ── convenience runner ────────────────────────────────────────────────────────

def run_query(
    app,
    query:   str,
    user_id: str = "default",
) -> RAGState:
    """
    Run a single query through the compiled workflow.

    Args:
        app:     compiled LangGraph app from build_workflow()
        query:   user question
        user_id: for multi-user memory separation (future use)

    Returns:
        Final RAGState with answer, sources, confidence, trace.
    """
    initial_state: RAGState = {
        "query":               query,
        "user_id":             user_id,
        "rewritten_query":     "",
        "sub_questions":       [],
        "query_type":          "factual",
        "requires_web":        False,
        "raw_chunks":          [],
        "web_triggered":       False,
        "relevance_sufficient": True,
        "relevance_gaps":      [],
        "reranked_chunks":     [],
        "answer":              "",
        "confidence_score":    0.0,
        "hallucination_flag":  False,
        "unsupported_claims":  [],
        "retry_count":         0,
        "improvement_hint":    "",
        "memory_context":      "",
        "final_response":      "",
        "sources":             [],
        "trace":               [],
    }

    result = app.invoke(initial_state)
    logger.info(
        "Query completed. Nodes visited: %s | Confidence: %.2f | Web: %s",
        " → ".join(result.get("trace", [])),
        result.get("confidence_score", 0.0),
        result.get("web_triggered", False),
    )
    return result
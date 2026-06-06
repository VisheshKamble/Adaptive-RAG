"""
graph_store.py — persistent knowledge graph using NetworkX (local)
                  or Neo4j (production).

The graph stores:
  Nodes: entities (people, orgs, concepts)  with type + frequency attributes
  Edges: relationships between entities      with predicate + weight attributes
  Special nodes: "query::<text>" to track conversation history

Grows with every conversation → future queries can retrieve relevant
context from the user's history without relying on the vector store alone.
"""

from __future__ import annotations

import logging
import pickle
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import networkx as nx

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import GRAPH_BACKEND, GRAPH_FILE

logger = logging.getLogger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _ts() -> str:
    return datetime.utcnow().isoformat()


# ── GraphStore ────────────────────────────────────────────────────────────────

class GraphStore:
    """
    Wraps a NetworkX DiGraph with persistence and query helpers.
    Supports both local (NetworkX pickle) and remote (Neo4j) backends.
    """

    def __init__(
        self,
        backend:    str  = GRAPH_BACKEND,
        graph_file: Path = GRAPH_FILE,
    ):
        self.backend    = backend
        self.graph_file = graph_file
        self.graph: nx.DiGraph = nx.DiGraph()

        if backend == "networkx":
            self._load_networkx()
        elif backend == "neo4j":
            self._init_neo4j()
        else:
            raise ValueError(f"Unknown graph backend: {backend}")

    # ── NetworkX backend ──────────────────────────────────────────────────────

    def _load_networkx(self) -> None:
        if self.graph_file.exists():
            with open(self.graph_file, "rb") as f:
                self.graph = pickle.load(f)
            logger.info(
                "Loaded graph: %d nodes, %d edges from %s",
                self.graph.number_of_nodes(),
                self.graph.number_of_edges(),
                self.graph_file,
            )
        else:
            logger.info("No existing graph found. Starting fresh.")

    def _save_networkx(self) -> None:
        self.graph_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.graph_file, "wb") as f:
            pickle.dump(self.graph, f)
        logger.debug("Graph persisted to %s", self.graph_file)

    # ── Neo4j backend (optional, production) ─────────────────────────────────

    def _init_neo4j(self) -> None:
        try:
            from neo4j import GraphDatabase
            from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
            self._neo4j_driver = GraphDatabase.driver(
                NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)
            )
            logger.info("Connected to Neo4j at %s", NEO4J_URI)
        except ImportError:
            raise ImportError("Install neo4j: pip install neo4j")

    # ── write operations ──────────────────────────────────────────────────────

    def add_entity(
        self,
        name:        str,
        entity_type: str = "CONCEPT",
        **attrs,
    ) -> None:
        """Add or update an entity node."""
        if self.graph.has_node(name):
            self.graph.nodes[name]["frequency"] = self.graph.nodes[name].get("frequency", 0) + 1
            self.graph.nodes[name]["last_seen"] = _ts()
        else:
            self.graph.add_node(
                name,
                entity_type=entity_type,
                frequency=1,
                created_at=_ts(),
                last_seen=_ts(),
                **attrs,
            )

    def add_relation(
        self,
        subject:   str,
        predicate: str,
        obj:       str,
        weight:    float = 1.0,
    ) -> None:
        """Add or strengthen a directed relationship edge."""
        self.add_entity(subject)
        self.add_entity(obj)

        if self.graph.has_edge(subject, obj):
            self.graph[subject][obj]["weight"]  = self.graph[subject][obj].get("weight", 1.0) + weight
            self.graph[subject][obj]["last_seen"] = _ts()
        else:
            self.graph.add_edge(
                subject, obj,
                predicate=predicate,
                weight=weight,
                created_at=_ts(),
                last_seen=_ts(),
            )

    def add_query_node(self, query: str, topic_summary: str) -> None:
        """Track what the user asked for conversation context."""
        node_id = f"query::{_ts()}"
        self.graph.add_node(
            node_id,
            node_type="query",
            text=query[:200],
            summary=topic_summary,
            created_at=_ts(),
        )

    def save(self) -> None:
        if self.backend == "networkx":
            self._save_networkx()

    # ── read operations ───────────────────────────────────────────────────────

    def get_entity_context(
        self,
        entity_name:  str,
        depth:        int = 2,
    ) -> List[Dict]:
        """
        Return entities and relations within `depth` hops of entity_name.
        Used by memory_retriever to build conversational context.
        """
        if not self.graph.has_node(entity_name):
            return []

        subgraph_nodes = {entity_name}
        frontier = {entity_name}

        for _ in range(depth):
            next_frontier = set()
            for node in frontier:
                next_frontier.update(self.graph.successors(node))
                next_frontier.update(self.graph.predecessors(node))
            subgraph_nodes.update(next_frontier)
            frontier = next_frontier

        triples = []
        for u, v, data in self.graph.edges(data=True):
            if u in subgraph_nodes or v in subgraph_nodes:
                triples.append({
                    "subject":   u,
                    "predicate": data.get("predicate", "related_to"),
                    "object":    v,
                    "weight":    data.get("weight", 1.0),
                })
        return triples

    def get_top_entities(self, n: int = 20) -> List[Tuple[str, Dict]]:
        """Return the n most frequently mentioned entities."""
        nodes = [
            (name, data) for name, data in self.graph.nodes(data=True)
            if not str(name).startswith("query::")
        ]
        nodes.sort(key=lambda x: x[1].get("frequency", 0), reverse=True)
        return nodes[:n]

    def search_entities(self, query: str) -> List[str]:
        """Simple substring search over entity names."""
        q = query.lower()
        return [
            name for name in self.graph.nodes
            if q in str(name).lower() and not str(name).startswith("query::")
        ]

    def stats(self) -> Dict:
        return {
            "nodes": self.graph.number_of_nodes(),
            "edges": self.graph.number_of_edges(),
            "top_entities": [name for name, _ in self.get_top_entities(5)],
        }
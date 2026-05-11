/**
 * dag.js — Deterministic Causal DAG
 * GNU GPL v3.0 | Commercial License available
 * Copyright © 2026 James Chapman
 */

export class CausalDAG {
  constructor() {
    // nodes: id -> node data
    this.nodes = new Map();

    // edges: adjacency list (from -> Set(to))
    this.edges = new Map();
  }

  // ═══════════════════════════════════════════════════════════════
  // NODE OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  addNode(id, data = {}) {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, data);
    }
  }

  addEdge(from, to) {
    if (!this.edges.has(from)) {
      this.edges.set(from, new Set());
    }
    this.edges.get(from).add(to);
  }

  // ═══════════════════════════════════════════════════════════════
  // DAG VALIDATION (cycle detection via DFS)
  // ═══════════════════════════════════════════════════════════════

  isAcyclic() {
    const WHITE = 0; // unvisited
    const GRAY = 1;  // visiting
    const BLACK = 2; // done

    const state = new Map();

    const nodes = new Set([
      ...this.nodes.keys(),
      ...this.edges.keys(),
    ]);

    for (const n of nodes) {
      state.set(n, WHITE);
    }

    const dfs = (node) => {
      state.set(node, GRAY);

      const neighbors = this.edges.get(node) || [];

      for (const next of neighbors) {
        if (state.get(next) === GRAY) return false; // cycle
        if (state.get(next) === WHITE && !dfs(next)) return false;
      }

      state.set(node, BLACK);
      return true;
    };

    for (const node of nodes) {
      if (state.get(node) === WHITE) {
        if (!dfs(node)) return false;
      }
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // METADATA (used by your CLI verify system)
  // ═══════════════════════════════════════════════════════════════

  summary() {
    let edgeCount = 0;

    for (const [, set] of this.edges) {
      edgeCount += set.size;
    }

    return {
      nodes: this.nodes.size,
      edges: edgeCount,
      causalDAGValid: this.isAcyclic(),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // OPTIONAL: deterministic serialization (for hashing/replay)
  // ═══════════════════════════════════════════════════════════════

  serialize() {
    return {
      nodes: [...this.nodes.entries()].sort(),
      edges: [...this.edges.entries()].map(([k, v]) => [
        k,
        [...v].sort(),
      ]).sort(),
    };
  }
}
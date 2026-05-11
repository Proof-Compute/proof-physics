/**
 * main.js — Proof-Physics Runtime Orchestrator
 * GNU GPL v3.0 | Commercial License available
 * Copyright © 2026 James Chapman
 */

import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { performance } from 'node:perf_hooks';

import { Universe } from './universe.js';
import { CausalDAG } from './dag.js';
import { execBlock } from './transitions.js';

// ════════════════════════════════════════════════════════════════
// CORE LOADER
// ════════════════════════════════════════════════════════════════

export async function loadUniverse(file) {
  if (!file) throw new Error('No universe file provided');

  const resolved = resolve(process.cwd(), file);
  const url = pathToFileURL(resolved) + `?t=${Date.now()}`;

  const mod = await import(url);

  let u = mod.default ?? mod.universe ?? mod.Universe;

  if (typeof u === 'function') u = u();
  if (!u || typeof u !== 'object') {
    throw new Error('Invalid universe export');
  }

  return u;
}

// ════════════════════════════════════════════════════════════════
// VALIDATION LAYER (prevents your earlier crashes)
// ════════════════════════════════════════════════════════════════

export function validateUniverse(u) {
  const required = ['run', 'verify', 'state', 'history'];

  for (const key of required) {
    if (!(key in u)) {
      throw new Error(`Universe missing required field: ${key}`);
    }
  }

  if (typeof u.run !== 'function') {
    throw new Error('Universe.run must be a function');
  }

  return true;
}

// ════════════════════════════════════════════════════════════════
// DAG + EXECUTION CONTEXT
// ════════════════════════════════════════════════════════════════

export function createRuntime(u) {
  const dag = new CausalDAG();

  return {
    universe: u,
    dag,

    step(block) {
      // record DAG node
      dag.addNode(block.id ?? `${u.state.tick ?? 0}`);
      if (block.from && block.to) {
        dag.addEdge(block.from, block.to);
      }

      // execute transition
      u.state = execBlock(u.state, block);

      return u.state;
    },

    run(n = 1) {
      for (let i = 0; i < n; i++) {
        u.run(1); // delegate to universe logic
      }
      return u.state;
    },

    verify() {
      const base = u.verify?.() ?? {};

      return {
        ...base,
        causalDAGValid: dag.isAcyclic(),
        dag: dag.summary()
      };
    }
  };
}

// ════════════════════════════════════════════════════════════════
// HIGH LEVEL ENTRYPOINT
// ════════════════════════════════════════════════════════════════

export async function runUniverse(file, ticks = 1) {
  const u = await loadUniverse(file);
  validateUniverse(u);

  const runtime = createRuntime(u);

  const start = performance.now();
  runtime.run(ticks);
  const elapsed = performance.now() - start;

  const v = runtime.verify();

  return {
    universe: u,
    runtime,
    verification: v,
    metrics: {
      ticks,
      elapsed
    }
  };
}

// ════════════════════════════════════════════════════════════════
// CLI COMPAT ENTRY
// ════════════════════════════════════════════════════════════════

export async function main(file, ticks = 100) {
  const result = await runUniverse(file, ticks);

  console.log('\n╔══ proof-physics runtime ══╗\n');

  console.log('ticks:', result.metrics.ticks);
  console.log('elapsed:', result.metrics.elapsed.toFixed(2) + 'ms');

  console.log('\nstate:', result.universe.state);

  console.log('\nDAG:');
  console.log(result.verification.dag);

  console.log('\nvalid:', result.verification.causalDAGValid ? '✓' : '✗');

  return result;
}
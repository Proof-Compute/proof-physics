/**
 * transitions.js — deterministic state transitions + op/constraint DSL
 * GNU GPL v3.0 | Commercial License available
 * Copyright © 2026 James Chapman
 */

import { evaluate } from './expr.js';

// ════════════════════════════════════════════════════════════════
// CORE TRANSITION ENGINE
// ════════════════════════════════════════════════════════════════

/**
 * Apply a single transition node to state (returns new state).
 */
function applyNode(state, node) {
  const next = structuredClone(state);
  return applyNodeMut(next, node);
}

/**
 * Mutate `next` in place with a single node. Returns `next`.
 * (Internal — avoids redundant clones when iterating a list.)
 */
function applyNodeMut(next, node) {
  switch (node.type) {
    case 'SET': {
      setPath(next, node.key, evaluate(node.value, next));
      break;
    }

    case 'INC': {
      const cur = getPath(next, node.key) ?? 0;
      setPath(next, node.key, cur + evaluate(node.value, next));
      break;
    }

    case 'DEC': {
      const cur = getPath(next, node.key) ?? 0;
      setPath(next, node.key, cur - evaluate(node.value, next));
      break;
    }

    case 'MUL': {
      const cur = getPath(next, node.key) ?? 0;
      setPath(next, node.key, cur * evaluate(node.value, next));
      break;
    }

    case 'DIV': {
      const divisor = evaluate(node.value, next);
      if (divisor === 0) throw new Error('Division by zero');
      const cur = getPath(next, node.key) ?? 0;
      setPath(next, node.key, cur / divisor);
      break;
    }

    case 'APPEND': {
      const arr = getPath(next, node.key);
      if (!Array.isArray(arr)) setPath(next, node.key, []);
      getPath(next, node.key).push(evaluate(node.value, next));
      break;
    }

    case 'IF': {
      if (evaluate(node.condition, next)) {
        for (const child of node.then ?? []) applyNodeMut(next, child);
      } else if (node.else) {
        for (const child of node.else) applyNodeMut(next, child);
      }
      break;
    }

    default:
      throw new Error(`Unknown block type: ${node.type}`);
  }

  return next;
}

/**
 * execBlock — apply an array of transition nodes to state.
 * Returns the new state (does not mutate the original).
 *
 * @param {object} state - current state
 * @param {Array}  nodes - array of transition nodes
 * @returns {{ state: object }}
 */
export function execBlock(state, nodes) {
  const next = structuredClone(state);
  for (const node of [].concat(nodes)) {
    applyNodeMut(next, node);
  }
  return { state: next };
}

// ════════════════════════════════════════════════════════════════
// DOT-PATH HELPERS  (supports "agents.0.balance" style keys)
// ════════════════════════════════════════════════════════════════

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] === undefined) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// ════════════════════════════════════════════════════════════════
// DSL HELPERS — op.set / op.ref / op.binop / op.if / constraint
// ════════════════════════════════════════════════════════════════

export const op = {
  /** Set a field: op.set('particle.x', <expr>) */
  set: (key, value) => ({ type: 'SET', key, value }),

  /** Increment a field: op.inc('score', 1) */
  inc: (key, value) => ({ type: 'INC', key, value }),

  /** Decrement a field */
  dec: (key, value) => ({ type: 'DEC', key, value }),

  /** Multiply a field */
  mul: (key, value) => ({ type: 'MUL', key, value }),

  /** Divide a field */
  div: (key, value) => ({ type: 'DIV', key, value }),

  /** Append to array field */
  append: (key, value) => ({ type: 'APPEND', key, value }),

  /** Field reference expression: op.ref('particle.vy') → { $ref: 'particle.vy' } */
  ref: (path) => ({ $ref: path }),

  /** Binary operation expression: op.binop('+', a, b) → { $op: '+', left: a, right: b } */
  binop: ($op, left, right) => ({ $op, left, right }),

  /** Ternary expression: op.ternary(cond, thenExpr, elseExpr) */
  ternary: ($if, $then, $else) => ({ $if, $then, $else }),

  /** Conditional block: op.if(condition, [thenNodes], [elseNodes]) */
  if: (condition, then_, else_ = []) => ({ type: 'IF', condition, then: then_, else: else_ }),
};

/**
 * constraint(message, checkFn) — builds a constraint descriptor.
 *
 * @param {string}   message  - human-readable description
 * @param {Function} check    - (state) => boolean
 */
export function constraint(message, check) {
  return { message, check };
}

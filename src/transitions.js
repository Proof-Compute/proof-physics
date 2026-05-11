// expr.js — safe expression evaluator against state context
// GNU GPL v3.0 | Commercial License available
// Copyright © 2026 James Chapman

const OPS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  },
  '%': (a, b) => a % b,
  '**': (a, b) => a ** b,
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  '&&': (a, b) => a && b,
  '||': (a, b) => a || b,
};

/**
 * Safe dot-path resolver
 */
export function resolve(path, state) {
  if (typeof path !== 'string') return path;

  return path.split('.').reduce((obj, key) => {
    if (obj && typeof obj === 'object') {
      return obj[key];
    }
    return undefined;
  }, state);
}

/**
 * Safe built-ins (restricted surface area for determinism)
 */
const BUILTINS = {
  Math: {
    abs: Math.abs,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    max: Math.max,
    min: Math.min,
    pow: Math.pow,
    sqrt: Math.sqrt,
  },
  Number,
  String,
  Boolean,
  Array,
  JSON,
};

/**
 * Evaluate expression node
 */
export function evaluate(expr, state) {
  if (expr === null || expr === undefined) return expr;

  // primitives
  if (typeof expr !== 'object') return expr;

  // array literal (ONLY one canonical form)
  if (Array.isArray(expr)) {
    return expr.map(e => evaluate(e, state));
  }

  // safe reference
  if (Object.prototype.hasOwnProperty.call(expr, '$ref')) {
    return resolve(expr.$ref, state);
  }

  // binary op
  if (Object.prototype.hasOwnProperty.call(expr, '$op')) {
    const fn = OPS[expr.$op];
    if (!fn) throw new Error(`Unknown operator: ${expr.$op}`);

    return fn(
      evaluate(expr.left, state),
      evaluate(expr.right, state)
    );
  }

  // ternary
  if (Object.prototype.hasOwnProperty.call(expr, '$if')) {
    return evaluate(expr.$if, state)
      ? evaluate(expr.$then, state)
      : evaluate(expr.$else, state);
  }

  // explicit array literal form
  if (Object.prototype.hasOwnProperty.call(expr, '$array')) {
    return expr.$array.map(e => evaluate(e, state));
  }

  // safe built-in calls
  if (Object.prototype.hasOwnProperty.call(expr, '$call')) {
    const [ns, fn] = expr.$call.split('.');

    const args = (expr.args ?? []).map(a => evaluate(a, state));

    if (!BUILTINS[ns] || !BUILTINS[ns][fn]) {
      throw new Error(`Unknown built-in: ${expr.$call}`);
    }

    return BUILTINS[ns][fn](...args);
  }

  // object evaluation (SAFE: no prototype leakage)
  const out = {};
  for (const [k, v] of Object.entries(expr)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
      continue;
    }
    out[k] = evaluate(v, state);
  }

  return out;
}

/**
 * transitions.js — deterministic state transitions
 * GNU GPL v3.0 | Commercial License available
 * Copyright © 2026 James Chapman
 */

/**
 * Core deterministic transition function
 * Applies a single execution block to state
 */
/**
 * transitions.js — deterministic state transitions
 * GNU GPL v3.0 | Commercial License available
 * Copyright © 2026 James Chapman
 */

export function execBlock(state, block) {
  const next = structuredClone(state);

  switch (block.type) {
    case 'SET':
      next[block.key] = block.value;
      break;

    case 'INC':
      next[block.key] = (next[block.key] ?? 0) + block.value;
      break;

    case 'DEC':
      next[block.key] = (next[block.key] ?? 0) - block.value;
      break;

    case 'MUL':
      next[block.key] = (next[block.key] ?? 0) * block.value;
      break;

    case 'DIV':
      if (block.value === 0) throw new Error('Division by zero');
      next[block.key] = (next[block.key] ?? 0) / block.value;
      break;

    case 'APPEND':
      if (!Array.isArray(next[block.key])) next[block.key] = [];
      next[block.key].push(block.value);
      break;

    default:
      throw new Error(`Unknown block type: ${block.type}`);
  }

  return next;
}
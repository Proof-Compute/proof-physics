// expr.js — safe expression evaluator against state context
// GNU GPL v3.0 | Commercial License available
// Copyright © 2026 James Chapman

const OPS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => (b !== 0 ? a / b : (() => { throw new Error('Division by zero'); })()),
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
 * Resolve a dot-path from state: "agent.health" -> state.agent.health
 * @param {string} path - dot-separated path
 * @param {object} state - state object
 */
export function resolve(path, state) {
  if (typeof path !== 'string') return path;
  return path.split('.').reduce((obj, key) => obj?.[key], state);
}

/**
 * Evaluate a JSONFlow expression node against state
 *
 * Expression format:
 *   scalar literal:    42 | "str" | true
 *   field ref:         { $ref: "field.path" }
 *   binary op:         { $op: "+", left: <expr>, right: <expr> }
 *   ternary:           { $if: <expr>, $then: <expr>, $else: <expr> }
 *   array literal:     { $array: [<expr>, ...] }
 *   call (built-in):   { $call: "Math.abs", args: [<expr>] }
 *
 * @param {*} expr - expression node
 * @param {object} state - current state
 * @returns {*} result of evaluation
 */
export function evaluate(expr, state) {
  if (expr === null || expr === undefined) return expr;

  // Plain literal
  if (typeof expr !== 'object') return expr;

  // Array — evaluate each element
  if (Array.isArray(expr)) return expr.map(e => evaluate(e, state));

  // Field reference
  if ('$ref' in expr) return resolve(expr.$ref, state);

  // Binary operator
  if ('$op' in expr) {
    const fn = OPS[expr.$op];
    if (!fn) throw new Error(`Unknown operator: ${expr.$op}`);
    return fn(evaluate(expr.left, state), evaluate(expr.right, state));
  }

  // Ternary
  if ('$if' in expr) {
    return evaluate(expr.$if, state)
      ? evaluate(expr.$then, state)
      : evaluate(expr.$else, state);
  }

  // Array literal
  if ('$array' in expr) return expr.$array.map(e => evaluate(e, state));

  // Built-in call
  if ('$call' in expr) {
    const [ns, fn] = expr.$call.split('.');
    const args = (expr.args ?? []).map(a => evaluate(a, state));
    const builtins = { Math, Number, String, Boolean, Array, JSON };
    if (ns in builtins && fn in builtins[ns])
      return builtins[ns][fn](...args);
    throw new Error(`Unknown built-in: ${expr.$call}`);
  }

  // Plain object — evaluate values
  return Object.fromEntries(
    Object.entries(expr).map(([k, v]) => [k, evaluate(v, state)])
  );
}
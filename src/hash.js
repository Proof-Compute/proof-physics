/**
 * hash.js — Deterministic FNV-1a string hashing
 * GNU GPL v3.0 | Commercial License available
 * Copyright © 2026 James Chapman
 */

/**
 * Fully deterministic canonical serializer
 */
function stableStringify(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (value instanceof Date) {
    return `date:${value.toISOString()}`;
  }

  if (value instanceof Set) {
    return `set:[${[...value].map(stableStringify).sort().join(',')}]`;
  }

  if (value instanceof Map) {
    return `map:{${[...value.entries()]
      .map(([k, v]) => `${stableStringify(k)}:${stableStringify(v)}`)
      .sort()
      .join(',')}}`;
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const entries = keys.map(
      k => `${JSON.stringify(k)}:${stableStringify(value[k])}`
    );
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(String(value));
}

/**
 * Deterministic FNV-1a hash (32-bit)
 */
export function hash(value) {
  const str = stableStringify(value);

  let h = 2166136261n;

  for (let i = 0; i < str.length; i++) {
    h ^= BigInt(str.charCodeAt(i));
    h = BigInt.asUintN(32, h * 16777619n);
  }

  return h.toString(16).padStart(8, '0');
}

/**
 * Stable pair hashing for Merkle tree
 */
function pairHash(a, b) {
  return hash(`${a}|${b}`);
}

/**
 * Compute Merkle root of hash sequence
 */
export function merkleRoot(hashes) {
  if (!hashes.length) return '00000000';

  let layer = [...hashes];

  while (layer.length > 1) {
    const next = [];

    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = layer[i + 1] ?? layer[i];
      next.push(pairHash(a, b));
    }

    layer = next;
  }

  return layer[0];
}
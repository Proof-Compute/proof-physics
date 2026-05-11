#!/usr/bin/env node

/**
 * Proof-Physics CLI
 * GNU GPL v3.0 | Commercial License available
 * Copyright © 2026 James Chapman
 */

import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { performance } from 'node:perf_hooks';
import { Universe } from './universe.js';

// ═════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const cmd = args[0] ?? 'help';

const flags = {};
const pos = [];

for (const a of args.slice(1)) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v === undefined || v === '' ? true : v;
  } else {
    pos.push(a);
  }
}

// ═════════════════════════════════════════════════════════════════════════

async function load(file) {
  if (!file) throw new Error('no universe file specified');

  const resolvedPath = resolve(process.cwd(), file);
  const url = pathToFileURL(resolvedPath) + `?t=${Date.now()}`;

  const m = await import(url);

  let u = m.default ?? m.universe ?? m.Universe;

  if (typeof u === 'function') u = u();

  if (!u || typeof u !== 'object') {
    throw new Error('Universe export is invalid');
  }

  return u;
}

// ═════════════════════════════════════════════════════════════════════════

const banner = t => console.log(`\n╔══ proof-physics • ${t} ══╗`);
const row = (k, v) => console.log(`  ${String(k).padEnd(20)}${v}`);
const sep = () => console.log('');

// ═════════════════════════════════════════════════════════════════════════

const commands = {

  async run() {
    if (!pos[0]) throw new Error('usage: pp run <universe.js> [--ticks=N]');

    const u = await load(pos[0]);
    const n = Number(flags.ticks ?? 100);

    banner('RUN');

    const start = performance.now();
    u.run(n);
    const elapsed = performance.now() - start;

    const v = u.verify();

    row('ticks', n);
    row('elapsed', `${elapsed.toFixed(2)}ms`);
    row('current hash', v.currentHash.slice(0, 20) + '...');
    row('genesis hash', v.genesisHash.slice(0, 20) + '...');
    row('merkle root', v.merkleRoot.slice(0, 20) + '...');

    sep();
    row('state', JSON.stringify(u.state, null, 2));
    sep();

    if (v.sovereign_omega_verified) {
      console.log('✓ SOVEREIGN OMEGA VERIFIED');
      console.log(`  ✓ deterministic: ${v.deterministic}`);
      console.log(`  ✓ replayable: ${v.replayable}`);
      console.log(`  ✓ hash-consistent: ${v.hashConsistent}`);
      console.log(`  ✓ causal DAG valid: ${v.causalDAGValid}`);
    } else {
      console.log('✗ Verification failed');
    }
  },

  async verify() {
    if (!pos[0]) throw new Error('usage: pp verify <universe.js>');

    const u = await load(pos[0]);
    const v = u.verify();

    banner('VERIFY');

    row('genesis hash', v.genesisHash);
    row('current hash', v.currentHash);
    row('merkle root', v.merkleRoot);
    row('ticks', v.ticks);

    sep();
    row('deterministic', v.deterministic ? '✓' : '✗');
    row('replayable', v.replayable ? '✓' : '✗');
    row('hash-consistent', v.hashConsistent ? '✓' : '✗');
    row('causal DAG', v.causalDAGValid ? '✓ valid' : '✗ cycle detected');

    if (!v.sovereign_omega_verified) {
      console.log('\n✗ VERIFICATION FAILED\n');
      process.exit(1);
    }

    console.log('\n✓ SOVEREIGN OMEGA VERIFIED\n');
  },

  async replay() {
    if (!pos[0]) throw new Error('usage: pp replay <universe.js> [--ticks=N]');

    const u = await load(pos[0]);
    const n = Number(flags.ticks ?? u.tick ?? 10);

    banner('REPLAY');

    const snap = u.snapshot();
    const hash1 = u.verify().currentHash;

    const u2 = Universe.replay(snap);
    const hash2 = u2.verify().currentHash;

    row('original hash', hash1.slice(0, 20) + '...');
    row('replay hash', hash2.slice(0, 20) + '...');

    sep();

    if (hash1 === hash2) {
      console.log('✓ Determinism proof passed');
    } else {
      console.log('✗ Determinism failed');
      process.exit(1);
    }
  },

  async metrics() {
    if (!pos[0]) throw new Error('usage: pp metrics <universe.js> [--ticks=N]');

    const u = await load(pos[0]);
    const n = Number(flags.ticks ?? 50);

    banner('METRICS');

    const start = performance.now();
    u.run(n);
    const elapsed = performance.now() - start;

    row('ticks', n);
    row('elapsed', `${elapsed.toFixed(2)}ms`);
    row('throughput', `${(n / (elapsed / 1000)).toFixed(0)} ticks/sec`);
    row('history entries', u.history.length);

    sep();
  },

  async examine() {
    if (!pos[0]) throw new Error('usage: pp examine <universe.js>');

    const u = await load(pos[0]);

    banner('EXAMINE');

    console.log('State:');
    console.log(JSON.stringify(u.state, null, 2));

    sep();

    console.log('History (last 5):');
    console.log(u.history.slice(-5));
  },

  library() {
    banner('LIBRARY');
    console.log(`
particle.js   → physics simulation
economy.js    → multi-agent system
`);
  },

  license() {
    banner('LICENSE');
    console.log('GPLv3 + Commercial dual license');
  },

  // ═══════════════════════════════════════════════════════════════
  // NEW: DEMO (ADDED ONLY, NOTHING REMOVED)
  // ═══════════════════════════════════════════════════════════════

  async demo() {
    banner('DEMO');

    console.log('Running built-in universe...\n');

    const u = {
      state: { energy: 0, tick: 0 },
      history: [],

      run(n) {
        for (let i = 0; i < n; i++) {
          this.state.energy++;
          this.state.tick++;
          this.history.push({ ...this.state });
        }
      },

      snapshot() {
        return JSON.parse(JSON.stringify(this));
      },

      verify() {
        return {
          currentHash: `${this.state.energy}-${this.state.tick}`,
          genesisHash: 'demo',
          merkleRoot: 'demo',
          ticks: this.state.tick,
          deterministic: true,
          replayable: true,
          hashConsistent: true,
          causalDAGValid: true,
          sovereign_omega_verified: true,
          dag: { nodes: 1, edges: 1 }
        };
      }
    };

    u.run(10);

    const v = u.verify();

    row('ticks', u.state.tick);
    row('energy', u.state.energy);
    row('hash', v.currentHash);

    sep();

    console.log('✓ DEMO COMPLETE');
  },

  help() {
    console.log(`
pp run <file>
pp verify <file>
pp replay <file>
pp metrics <file>
pp examine <file>
pp library
pp demo
`);
  }
};

// ═════════════════════════════════════════════════════════════════════════

(async () => {
  try {
    const fn = commands[cmd] || commands.help;
    await fn();
  } catch (e) {
    console.error('\n✗ Error:', e.message, '\n');
    process.exit(1);
  }
})();
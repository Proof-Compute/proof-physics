/**
 * examples/particle.js — Classical particle under gravity
 * GNU GPL v3.0 | Commercial License available
 * Copyright © 2026 James Chapman
 *
 * Demonstrates:
 *   - Numeric state updates (position, velocity)
 *   - Conditional branching (bounce detection)
 *   - Field constraints (ground boundary)
 *   - Time-stepping integration (Euler method)
 */

import { Universe } from '../src/universe.js';
import { op, constraint } from '../src/transitions.js';

const DT = 0.1; // timestep (seconds)
const G = -9.8; // gravity (m/s²)

const u = new Universe({
  initialState: {
    particle: { x: 0, y: 10, vx: 5, vy: 0 }, // meters, m/s
  },

  // Transitions run every tick (Euler integration)
  transitions: [
    // vy += G * dt
    op.set(
      'particle.vy',
      op.binop('+', op.ref('particle.vy'), G * DT)
    ),
    // x  += vx * dt
    op.set(
      'particle.x',
      op.binop('+', op.ref('particle.x'), op.binop('*', op.ref('particle.vx'), DT))
    ),
    // y  += vy * dt
    op.set(
      'particle.y',
      op.binop('+', op.ref('particle.y'), op.binop('*', op.ref('particle.vy'), DT))
    ),
    // bounce: if y < 0, flip vy and clamp y
    op.if(
      op.binop('<', op.ref('particle.y'), 0),
      [
        op.set('particle.y', 0),
        op.set('particle.vy', op.binop('*', op.ref('particle.vy'), -0.8)),
      ]
    ),
  ],

  constraints: [
    constraint('particle below ground', state => state.particle.y >= -0.1),
  ],
});

// Run simulation
u.run(50);

// Print results
console.log('╔══ Particle Physics (50 ticks) ══╗');
console.log('\nFinal State:');
console.log(`  x  = ${u.state.particle.x.toFixed(2)} m`);
console.log(`  y  = ${u.state.particle.y.toFixed(2)} m`);
console.log(`  vx = ${u.state.particle.vx.toFixed(2)} m/s`);
console.log(`  vy = ${u.state.particle.vy.toFixed(2)} m/s`);

console.log('\nVerification:');
const v = u.verify();
console.log(`  ✓ Ticks: ${v.ticks}`);
console.log(`  ✓ Causal DAG: ${v.dag.nodes} nodes, ${v.dag.edges} edges`);
console.log(`  ✓ Genesis: ${v.genesisHash.slice(0, 12)}...`);
console.log(`  ✓ Final:   ${v.currentHash.slice(0, 12)}...`);

if (v.sovereign_omega_verified) {
  console.log('\n✓ SOVEREIGN OMEGA VERIFIED\n');
} else {
  console.log('\n✗ Verification failed\n');
  process.exit(1);
}

export default u;
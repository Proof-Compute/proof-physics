/**
 * examples/economy.js — Multi-agent economy with conservation law
 * GNU GPL v3.0 | Commercial License available
 * Copyright © 2026 James Chapman
 *
 * Demonstrates:
 *   - Multi-agent state management
 *   - Dynamic transitions (custom per-tick logic)
 *   - Global invariants (money conservation)
 *   - Complex conditional branching (agent interactions)
 *
 * Scenario: 3 traders, each tick tries to buy goods from neighbors at price=$5
 */

import { Universe, op, constraint } from '../src/universe.js';

const u = new Universe({
  initialState: {
    agents: [
      { id: 'alice', balance: 100, goods: 10 },
      { id: 'bob', balance: 80, goods: 20 },
      { id: 'carol', balance: 120, goods: 5 },
    ],
    tick: 0,
    totalMoney: 300,
  },

  // Per tick: each agent buys 1 good from next agent at price=$5
  transitions: (state, tick) => [
    op.set('tick', tick),

    // alice -> bob trade
    op.if(
      op.binop('>=', op.ref('agents.0.balance'), 5),
      [
        op.set(
          'agents.0.balance',
          op.binop('-', op.ref('agents.0.balance'), 5)
        ),
        op.set('agents.0.goods', op.binop('+', op.ref('agents.0.goods'), 1)),
        op.set(
          'agents.1.balance',
          op.binop('+', op.ref('agents.1.balance'), 5)
        ),
        op.set('agents.1.goods', op.binop('-', op.ref('agents.1.goods'), 1)),
      ]
    ),

    // bob -> carol trade
    op.if(
      op.binop(
        '&&',
        op.binop('>=', op.ref('agents.1.balance'), 5),
        op.binop('>=', op.ref('agents.2.goods'), 1)
      ),
      [
        op.set(
          'agents.1.balance',
          op.binop('-', op.ref('agents.1.balance'), 5)
        ),
        op.set('agents.1.goods', op.binop('+', op.ref('agents.1.goods'), 1)),
        op.set(
          'agents.2.balance',
          op.binop('+', op.ref('agents.2.balance'), 5)
        ),
        op.set('agents.2.goods', op.binop('-', op.ref('agents.2.goods'), 1)),
      ]
    ),

    // carol -> alice trade
    op.if(
      op.binop(
        '&&',
        op.binop('>=', op.ref('agents.2.balance'), 5),
        op.binop('>=', op.ref('agents.0.goods'), 1)
      ),
      [
        op.set(
          'agents.2.balance',
          op.binop('-', op.ref('agents.2.balance'), 5)
        ),
        op.set('agents.2.goods', op.binop('+', op.ref('agents.2.goods'), 1)),
        op.set(
          'agents.0.balance',
          op.binop('+', op.ref('agents.0.balance'), 5)
        ),
        op.set('agents.0.goods', op.binop('-', op.ref('agents.0.goods'), 1)),
      ]
    ),
  ],

  constraints: [
    // Money conservation law — total must always be constant
    constraint('money conservation violated', state =>
      state.agents.reduce((sum, a) => sum + a.balance, 0) === state.totalMoney
    ),
    // No agent can go broke
    constraint('negative balance', state =>
      state.agents.every(a => a.balance >= 0)
    ),
    // No agent can have negative goods
    constraint('negative goods', state =>
      state.agents.every(a => a.goods >= 0)
    ),
  ],
});

// Run simulation
u.run(10);

// Print results
console.log('╔══ Multi-Agent Economy (10 ticks) ══╗');
console.log('\nFinal State:');
u.state.agents.forEach(a => {
  console.log(
    `  ${a.id.padEnd(6)}| balance=$${String(a.balance).padStart(3)} | goods=${String(a.goods).padStart(2)}`
  );
});

console.log(
  `\n  Total Money: $${u.state.agents.reduce((s, a) => s + a.balance, 0)} (conserved)`
);
console.log(
  `  Total Goods: ${u.state.agents.reduce((s, a) => s + a.goods, 0)} units`
);

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
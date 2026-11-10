/**
 * Minimal balance report: runs the default scenario across many seeds and
 * prints win rates, battle length and losses. Slice 4 grows this into the
 * full design-vs-design harness.
 *
 * Usage: npm run simulate [-- --runs 1000]
 */
import { createBattle, runBattle } from '../src/sim/battle';
import type { BattleSetup } from '../src/sim/battle';
import { createRng } from '../src/sim/rng';
import { defaultBattleSetup } from '../src/sim/scenario';

export interface SimulationReport {
  runs: number;
  wins: [number, number];
  draws: number;
  avgHours: number;
  maxHours: number;
  avgSunk: [number, number];
  avgEscaped: [number, number];
}

export function simulate(setup: BattleSetup, runs: number, firstSeed = 1): SimulationReport {
  const wins: [number, number] = [0, 0];
  let draws = 0;
  let hours = 0;
  let maxHours = 0;
  const sunk: [number, number] = [0, 0];
  const escaped: [number, number] = [0, 0];
  for (let i = 0; i < runs; i++) {
    const end = runBattle(createBattle(setup), createRng(firstSeed + i));
    const winner = end.result!.winner;
    if (winner === 'draw') draws++;
    else wins[winner]++;
    hours += end.result!.hours;
    maxHours = Math.max(maxHours, end.result!.hours);
    for (const s of end.ships) {
      if (s.status === 'sunk') sunk[s.side]++;
      if (s.status === 'escaped') escaped[s.side]++;
    }
  }
  return {
    runs,
    wins,
    draws,
    avgHours: hours / runs,
    maxHours,
    avgSunk: [sunk[0] / runs, sunk[1] / runs],
    avgEscaped: [escaped[0] / runs, escaped[1] / runs],
  };
}

function main() {
  const idx = process.argv.indexOf('--runs');
  const runs = idx >= 0 ? Number(process.argv[idx + 1]) : 1000;
  const setup = defaultBattleSetup();
  const r = simulate(setup, runs);
  const pct = (n: number) => `${((n / r.runs) * 100).toFixed(1)}%`;
  const [a, b] = setup.sides;
  console.log(`Scenario: ${a.name} (${a.ships.length} ships) vs ${b.name} (${b.ships.length} ships), ${r.runs} seeded runs`);
  console.log(`  ${a.name} wins: ${pct(r.wins[0])}`);
  console.log(`  ${b.name} wins: ${pct(r.wins[1])}`);
  console.log(`  Draws:          ${pct(r.draws)}`);
  console.log(`  Avg length:     ${r.avgHours.toFixed(1)} h (longest ${r.maxHours} h)`);
  console.log(`  Avg sunk:       ${a.name} ${r.avgSunk[0].toFixed(2)}, ${b.name} ${r.avgSunk[1].toFixed(2)}`);
  console.log(`  Avg escaped:    ${a.name} ${r.avgEscaped[0].toFixed(2)}, ${b.name} ${r.avgEscaped[1].toFixed(2)}`);
}

main();

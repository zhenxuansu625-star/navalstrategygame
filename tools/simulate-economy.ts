/**
 * Economy balance report.
 *
 *   npm run simulate:economy            full report
 *   npm run simulate:economy -- --quick skip the fleet battles
 *
 * 1. When to switch from civilian factories to dockyards: naval output by horizon.
 * 2. The same question settled by battles between the fleets each strategy builds.
 * 3. Each nation's AI-run economy, and what its traits are worth.
 */
import { NATIONS } from '../src/data/nations';
import { createBattle, runBattle } from '../src/sim/battle';
import {
  createGame,
  DEFAULT_CONTEXT,
  duel,
  fleetSide,
  fleetValue,
  navalOutput,
  producedByHorizon,
  REFERENCE_NATION,
  resolveModifiers,
  runEconomy,
  withNation,
  withoutTraits,
} from '../src/sim/economy';
import { createRng } from '../src/sim/rng';

const ctx = withNation(DEFAULT_CONTEXT, REFERENCE_NATION);
const quick = process.argv.includes('--quick');
const pad = (v: string | number, n: number) => String(v).padStart(n);

function timingTable(nationId: string, startYear: number) {
  const horizons = [24, 36, 60, 84, 96, 120, 180, 240];
  const transitions = [0, 6, 12, 24, 36, 48, 72, 144];
  const rows = transitions.map((T) => producedByHorizon(ctx, nationId, startYear, T, horizons));
  const best = horizons.map((_, j) => Math.max(...rows.map((r) => r[j]!)));
  console.log(`\n${ctx.nations.get(nationId)!.name} from ${startYear}: naval output as % of the best strategy at each horizon`);
  console.log(`  switch at   ${horizons.map((h) => pad(`${h / 12}y`, 6)).join('')}`);
  rows.forEach((row, i) => {
    console.log(`  month ${pad(transitions[i]!, 3)}   ${row.map((v, j) => pad(`${Math.round((100 * v) / best[j]!)}%`, 6)).join('')}`);
  });
  console.log(`  best        ${horizons.map((_, j) => pad(`m${transitions[rows.findIndex((r) => r[j] === best[j])]}`, 6)).join('')}`);
}

function battles() {
  console.log('\nFleet battles (reference nation, 12 seeds each): wins for the first strategy - second strategy - draws');
  const def = REFERENCE_NATION;
  const fleet = (T: number, months: number) =>
    runEconomy(ctx, { nationId: def.id, startYear: 1906, months, profile: { ...def.ai, transitionMonth: T } });
  for (const years of [3, 5, 8, 10, 15]) {
    const months = years * 12;
    const [rush, mid, late] = [fleet(0, months), fleet(24, months), fleet(48, months)];
    const fmt = (d: ReturnType<typeof duel>) => `${d.winsA}-${d.winsB}-${d.draws}`;
    const value = (s: typeof rush) => `${Math.round(fleetValue(ctx, s.nations[def.id]!) / 1000)}k`;
    console.log(
      `  after ${pad(years, 2)} years: rush ${value(rush)}, switch at 24 ${value(mid)}, switch at 48 ${value(late)} | ` +
        `rush v 24: ${fmt(duel(ctx, rush, def.id, mid, def.id, 12))} | rush v 48: ${fmt(duel(ctx, rush, def.id, late, def.id, 12))} | ` +
        `24 v 48: ${fmt(duel(ctx, mid, def.id, late, def.id, 12))}`,
    );
  }
}

function nations() {
  const startYear = 1922;
  const months = 180;
  console.log(`\nNations run by their own AI from ${startYear} for ${months / 12} years`);
  console.log('  nation            factories dockyards ships  fleet   traits: output   mirror battle');
  for (const def of NATIONS) {
    const plain = withNation(ctx, withoutTraits(def));
    const withTraits = runEconomy(ctx, { nationId: def.id, startYear, months });
    const without = runEconomy(plain, { nationId: def.id, startYear, months });
    const n = withTraits.nations[def.id]!;
    const effect = navalOutput(withTraits, def.id) / navalOutput(without, def.id) - 1;

    // Combat traits: the nation's starting fleet against the same ships without its ship-stat bonuses.
    let mirror = '      -';
    if (Object.keys(resolveModifiers(def).shipStats).length > 0) {
      const rivalId = NATIONS.find((x) => x.id !== def.id)!.id;
      const start = createGame(ctx, { playerId: def.id, rivalId, startYear: 1914 });
      const a = fleetSide(ctx, start, def.id);
      const b = fleetSide(plain, start, def.id);
      let wins = 0;
      const seeds = 100;
      for (let seed = 1; seed <= seeds; seed++) {
        if (runBattle(createBattle({ sides: [a, b] }), createRng(seed)).result!.winner === 0) wins++;
        if (runBattle(createBattle({ sides: [b, a] }), createRng(seed)).result!.winner === 1) wins++;
      }
      mirror = pad(`${Math.round((100 * wins) / (seeds * 2))}% wins`, 9);
    }
    console.log(
      `  ${def.name.padEnd(17)} ${pad(n.civilianFactories, 9)} ${pad(n.dockyards, 9)} ${pad(n.fleet.length, 5)} ${pad(`${Math.round(fleetValue(ctx, n) / 1000)}k`, 6)}` +
        `   ${pad(`${effect >= 0 ? '+' : ''}${(effect * 100).toFixed(1)}%`, 12)}   ${mirror}`,
    );
  }
  console.log('  "traits: output" compares the nation with the same nation stripped of its traits.');
  console.log('  "mirror battle" is its 1914 starting fleet against identical ships without its combat traits.');
}

timingTable('reference', 1906);
timingTable('uk', 1914);
timingTable('usa', 1922);
timingTable('japan', 1914);
timingTable('italy', 1906);
if (!quick) battles();
nations();

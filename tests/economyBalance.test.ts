/**
 * Balance guards for the economy. These run AI-driven campaigns and fail if the
 * choice between rushing dockyards and growing civilian industry first stops
 * being a real choice, or if a nation's traits drift out of band.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { NATIONS } from '../src/data/nations';
import { createBattle, runBattle } from '../src/sim/battle';
import {
  createGame,
  DEFAULT_CONTEXT,
  duel,
  fleetSide,
  industryReport,
  navalOutput,
  producedByHorizon,
  REFERENCE_NATION,
  resolveModifiers,
  runEconomy,
  withNation,
  withoutTraits,
} from '../src/sim/economy';
import { PRESET_DESIGNS } from '../src/data/designs';
import { createRng } from '../src/sim/rng';

const ctx = withNation(DEFAULT_CONTEXT, REFERENCE_NATION);
const HORIZONS = [36, 60, 96, 120, 180, 240]; // months
const TRANSITIONS = [0, 12, 24, 36, 48, 144]; // month the nation switches from factories to dockyards

type Table = number[][]; // [transition][horizon]
const at = (t: Table, transition: number, horizon: number) => t[TRANSITIONS.indexOf(transition)]![HORIZONS.indexOf(horizon)]!;
const bestAt = (t: Table, horizon: number) => Math.max(...t.map((row) => row[HORIZONS.indexOf(horizon)]!));
const bestTransition = (t: Table, horizon: number) => TRANSITIONS[t.findIndex((row) => row[HORIZONS.indexOf(horizon)] === bestAt(t, horizon))]!;
const table = (nationId: string, startYear: number): Table =>
  TRANSITIONS.map((T) => producedByHorizon(ctx, nationId, startYear, T, HORIZONS));

describe('rush dockyards vs grow industry first', () => {
  let ref: Table;
  beforeAll(() => {
    ref = table('reference', 1906);
  });

  it('rushing dockyards is best for a war in the first three years', () => {
    expect(bestTransition(ref, 36)).toBe(0);
    expect(at(ref, 36, 36)).toBeLessThan(at(ref, 0, 36) * 0.92);
  });

  it('growing industry first is best over twenty years', () => {
    expect(bestTransition(ref, 240)).toBeGreaterThanOrEqual(24);
    expect(at(ref, 0, 240)).toBeLessThan(bestAt(ref, 240) * 0.92);
  });

  it('no transition month is best at every horizon', () => {
    const winners = new Set(HORIZONS.map((h) => bestTransition(ref, h)));
    expect(winners.size).toBeGreaterThan(1);
  });

  it('the middle game is contested: sensible strategies are within 12% at 8 to 10 years', () => {
    for (const h of [96, 120]) {
      for (const T of [0, 12, 24]) expect(at(ref, T, h), `T${T} at ${h}`).toBeGreaterThan(bestAt(ref, h) * 0.88);
    }
  });

  it("neither side's edge is crushing", () => {
    // The investor is behind early and the rusher is behind late, but never by more than 30%.
    expect(at(ref, 48, 36)).toBeGreaterThan(at(ref, 0, 36) * 0.7);
    expect(at(ref, 0, 240)).toBeGreaterThan(bestAt(ref, 240) * 0.7);
  });

  it('never building dockyards for twelve years is punished', () => {
    for (const h of [120, 180]) {
      expect(at(ref, 144, h)).toBe(Math.min(...ref.map((row) => row[HORIZONS.indexOf(h)]!)));
    }
  });

  it('the same pattern holds for real nations', () => {
    for (const [id, year] of [['uk', 1914], ['japan', 1914]] as const) {
      const t = table(id, year);
      expect(bestTransition(t, 36), id).toBe(0);
      expect(bestTransition(t, 240), id).toBeGreaterThanOrEqual(24);
    }
  });

  it('the fleets themselves agree: the rusher wins an early war, the investor a late one', () => {
    const fleet = (T: number, months: number) =>
      runEconomy(ctx, { nationId: 'reference', startYear: 1906, months, profile: { ...REFERENCE_NATION.ai, transitionMonth: T } });
    const early = duel(ctx, fleet(0, 48), 'reference', fleet(36, 48), 'reference', 8);
    expect(early.winsA).toBeGreaterThan(early.winsB);
    const late = duel(ctx, fleet(0, 180), 'reference', fleet(36, 180), 'reference', 6);
    expect(late.winsB).toBeGreaterThan(late.winsA);
  });
});

describe('nation traits', () => {
  it('each nation keeps its historical flavour', () => {
    const mods = (id: string) => resolveModifiers(NATIONS.find((n) => n.id === id)!);
    expect(mods('usa').dockyardOutput.carrier).toBeGreaterThan(0.2);
    expect(mods('japan').shipStats.torpedoAttack).toBeGreaterThan(0);
    expect(mods('uk').dockyardOutput.battleship).toBeGreaterThan(0);
    expect(mods('germany').constructionSpeed.civilianFactory).toBeGreaterThan(0);
    expect(mods('russia').dockyardOutput.all).toBeLessThan(0);
    // Germany's U-boat bonus is defined but waits for submarines to exist.
    const uboat = NATIONS.find((n) => n.id === 'germany')!.traits.find((t) => t.id === 'uboat_arm')!;
    expect(uboat.modifiers.dockyardOutput?.submarine).toBeGreaterThan(0);
    expect(uboat.inactive).toBeTruthy();
    expect(mods('germany').dockyardOutput.submarine).toBeUndefined();
  });

  it('American carrier lines out-produce the same line without the trait by 25%', () => {
    const usa = NATIONS.find((n) => n.id === 'usa')!;
    const carrier = PRESET_DESIGNS.find((d) => d.id === 'preset_cv_1924')!;
    const output = (c: typeof ctx) => {
      const s = createGame(c, { playerId: 'usa', rivalId: 'uk', startYear: 1930 });
      const nation = { ...s.nations.usa!, lines: [{ id: 'l', design: carrier, dockyards: 5, efficiency: 1, progress: 0, built: 0, quantity: null }] };
      return industryReport(c, nation).lines[0]!.output;
    };
    expect(output(ctx) / output(withNation(ctx, withoutTraits(usa)))).toBeCloseTo(1.25);
  });

  it("no nation's traits swing its naval output by more than a few percent", () => {
    for (const def of NATIONS) {
      const run = (c: typeof ctx) => navalOutput(runEconomy(c, { nationId: def.id, startYear: 1922, months: 180 }), def.id);
      const effect = run(ctx) / run(withNation(ctx, withoutTraits(def))) - 1;
      expect(effect, def.name).toBeGreaterThan(-0.06);
      expect(effect, def.name).toBeLessThan(0.08);
    }
  });

  it('combat traits help in a mirror match without deciding it', () => {
    for (const def of NATIONS) {
      if (Object.keys(resolveModifiers(def).shipStats).length === 0) continue;
      const plain = withNation(ctx, withoutTraits(def));
      const rivalId = NATIONS.find((n) => n.id !== def.id)!.id;
      const state = createGame(ctx, { playerId: def.id, rivalId, startYear: 1914 });
      const withTraits = fleetSide(ctx, state, def.id);
      const without = fleetSide(plain, state, def.id);
      // Fight from both sides so that seat order cannot colour the result.
      let wins = 0;
      const seeds = 60;
      for (let seed = 1; seed <= seeds; seed++) {
        if (runBattle(createBattle({ sides: [withTraits, without] }), createRng(seed)).result!.winner === 0) wins++;
        if (runBattle(createBattle({ sides: [without, withTraits] }), createRng(seed)).result!.winner === 1) wins++;
      }
      const share = wins / (seeds * 2);
      expect(share, def.name).toBeGreaterThan(0.45);
      expect(share, def.name).toBeLessThan(0.8);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { PRESET_DESIGNS } from '../src/data/designs';
import { SCENARIOS, SHIP_NAMES } from '../src/data/scenarios';
import {
  aaDamageMultiplier,
  airStrike,
  carrierCoverRatio,
  carrierReachChance,
  createBattle,
  effectiveAa,
  isAirWaveHour,
  planesShotDown,
  runBattle,
  step,
  type BattleSetup,
  type BattleState,
  type ShipStats,
  type SideSetup,
} from '../src/sim/battle';
import { buildBattleSetup, DEFAULT_CATALOG, deriveStats, modulesForSlot, newDesign, validateDesign } from '../src/sim/designer';
import { createRng } from '../src/sim/rng';
import { stats, TEST_CONFIG as cfg } from './helpers';

const carrier = (o: Partial<ShipStats> = {}) => stats({ line: 'carrier', hp: 200, org: 50, armour: 5, visibility: 35, airWing: 40, ...o });
const side = (name: string, ships: Array<[string, ShipStats]>, aggressiveness: SideSetup['aggressiveness'] = 'alwaysEngage'): SideSetup => ({
  name,
  aggressiveness,
  ships: ships.map(([n, s]) => ({ name: n, className: s.line, stats: s })),
});

describe('air maths', () => {
  it('carrier cover is capitals per carrier over the target ratio, capped at 1', () => {
    // test config: 1 capital per carrier
    expect(carrierCoverRatio(cfg, 1, 2)).toBeCloseTo(0.5);
    expect(carrierCoverRatio(cfg, 4, 2)).toBe(1);
    expect(carrierCoverRatio(cfg, 0, 2)).toBe(0);
    expect(carrierCoverRatio(cfg, 3, 0)).toBe(1);
  });

  it('capitals draw fire away from carriers', () => {
    expect(carrierReachChance(cfg, 'heavy', 0, 2)).toBe(1);
    expect(carrierReachChance(cfg, 'heavy', 2, 2)).toBeCloseTo(0.5); // full cover blocks 50% in the test config
    expect(carrierReachChance(cfg, 'heavy', 1, 2)).toBeCloseTo(0.75);
  });

  it('waves launch on hours 1, 4, 7 ... with a 3-hour interval', () => {
    const hours = Array.from({ length: 10 }, (_, i) => i + 1).filter((h) => isAirWaveHour(cfg, h));
    expect(hours).toEqual([1, 4, 7, 10]);
    expect(isAirWaveHour(cfg, 0)).toBe(false);
  });

  it('the target gets its own AA plus a share of the rest of its fleet', () => {
    // test config: 50% of the rest of the fleet
    expect(effectiveAa(cfg, 10, 30)).toBeCloseTo(20);
    expect(effectiveAa(cfg, 10, 10)).toBeCloseTo(10);
  });

  it('AA halves damage at the configured point', () => {
    expect(aaDamageMultiplier(cfg, 0)).toBe(1);
    expect(aaDamageMultiplier(cfg, 20)).toBeCloseTo(0.5);
    expect(aaDamageMultiplier(cfg, 60)).toBeCloseTo(0.25);
  });

  it('AA shoots planes down: base + per AA, capped', () => {
    expect(planesShotDown(cfg, 40, 0)).toBe(4); // 10%
    expect(planesShotDown(cfg, 40, 20)).toBe(12); // 30%
    expect(planesShotDown(cfg, 40, 1000)).toBe(20); // capped at 50%
    expect(planesShotDown(cfg, 3, 1000)).toBeLessThanOrEqual(3);
  });

  it('a strike: losses first, then surviving planes deal damage reduced by AA', () => {
    const target = stats({ hp: 100, org: 50, armour: 10, aa: 20 });
    const s = airStrike(cfg, 40, target, 20, 0.5); // effective AA 20
    expect(s.shotDown).toBe(12);
    expect(s.attackers).toBe(28);
    // 28 planes * 1 attack * 0.5 AA multiplier, piercing 40 >= armour 10
    expect(s.pierced).toBe(true);
    expect(s.hp).toBeCloseTo(14);
  });

  it('armour thicker than bomb piercing blunts a strike', () => {
    const s = airStrike(cfg, 40, stats({ armour: 60 }), 0, 0.5);
    expect(s.pierced).toBe(false);
    expect(s.hp).toBeCloseTo(36 * cfg.damage.underPierceMultiplier);
  });
});

describe('carriers in battle', () => {
  const strikeSetup: BattleSetup = {
    sides: [
      side('Carriers', [['CV', carrier()]]),
      side('Target', [['T', stats({ hp: 5000, org: 5000, aa: 10 })]]),
    ],
  };

  it('launch only on wave hours and lose planes to AA', () => {
    const rng = createRng(1);
    let s: BattleState = createBattle(strikeSetup);
    expect(s.ships[0]!.planes).toBe(40);
    const airHours: number[] = [];
    for (let i = 0; i < 7; i++) {
      s = step(s, {}, rng, cfg);
      if (s.log.some((e) => e.type === 'air' && e.hour === s.hour)) airHours.push(s.hour);
    }
    expect(airHours).toEqual([1, 4, 7]);
    expect(s.ships[0]!.planes).toBeLessThan(40);
    const strikes = s.log.filter((e) => e.type === 'air');
    expect(strikes.every((e) => e.type === 'air' && e.shotDown > 0 && e.hpDamage > 0)).toBe(true);
  });

  it('a carrier with no planes left stops launching', () => {
    const s0 = createBattle(strikeSetup);
    s0.ships[0]!.planes = 0;
    const s1 = step(s0, {}, createRng(1), cfg);
    expect(s1.log.some((e) => e.type === 'air')).toBe(false);
  });

  it('fleets without carriers never produce air events', () => {
    for (const sc of SCENARIOS.filter((x) => x.id !== 'carriers')) {
      const { setup } = buildBattleSetup(DEFAULT_CATALOG, PRESET_DESIGNS, sc.fleets, SHIP_NAMES);
      const end = runBattle(createBattle(setup), createRng(3));
      expect(end.log.some((e) => e.type === 'air')).toBe(false);
    }
  });

  it('capital ships covering a carrier draw gunfire away from it', () => {
    const attackers = side('Guns', Array.from({ length: 4 }, (_, i) => [`G${i}`, stats({ heavyAttack: 20, heavyPiercing: 30 })] as [string, ShipStats]));
    const cv = (): [string, ShipStats] => ['CV', carrier({ hp: 50000, org: 50000, airWing: 0 })];
    const bb = (): [string, ShipStats] => ['BB', stats({ hp: 50000, org: 50000, visibility: 25 })];
    const carrierHpLost = (setup: BattleSetup) => {
      let lost = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const end = runBattle(createBattle(setup), createRng(seed), { ...cfg, maxHours: 6 });
        const c = end.ships.find((x) => x.name === 'CV')!;
        lost += c.stats.hp - c.hp;
      }
      return lost;
    };
    const alone = carrierHpLost({ sides: [attackers, side('D', [cv()])] });
    const covered = carrierHpLost({ sides: [attackers, side('D', [cv(), bb()])] });
    expect(covered).toBeLessThan(alone * 0.5);
  });
});

describe('carrier and dreadnought designs', () => {
  const preset = (id: string) => PRESET_DESIGNS.find((d) => d.id === id)!;

  it('carrier presets derive an air wing, AA and the carrier line', () => {
    const fleet = deriveStats(DEFAULT_CATALOG, preset('preset_cv_1942'));
    expect(fleet.line).toBe('carrier');
    expect(fleet.airWing).toBe(80); // 4 x Hangar III
    expect(fleet.aa).toBeGreaterThan(0);
    expect(fleet.heavyAttack).toBe(0);
    expect(deriveStats(DEFAULT_CATALOG, preset('preset_cv_1924')).airWing).toBe(24);
  });

  it('dreadnought presets are all-big-gun capital ships', () => {
    for (const id of ['preset_bb_1906', 'preset_bb_1925', 'preset_bc_1908']) {
      const s = deriveStats(DEFAULT_CATALOG, preset(id));
      expect(s.line).toBe('capital');
      expect(s.heavyAttack).toBeGreaterThanOrEqual(33);
      expect(validateDesign(DEFAULT_CATALOG, preset(id))).toEqual([]);
    }
  });

  it('hangars fit only carriers, and carriers have no main armament', () => {
    const cv = DEFAULT_CATALOG.hulls.get('cv1')!;
    const bb = DEFAULT_CATALOG.hulls.get('bb4')!;
    const hangarSlot = cv.slots.find((s) => s.id === 'hangar1')!;
    expect(modulesForSlot(DEFAULT_CATALOG, cv, hangarSlot).every((m) => m.category === 'hangar')).toBe(true);
    for (const slot of bb.slots) expect(modulesForSlot(DEFAULT_CATALOG, bb, slot).some((m) => m.category === 'hangar')).toBe(false);
    expect(cv.slots.some((s) => s.group === 'main')).toBe(false);
  });

  it('a new carrier design is valid and carries planes', () => {
    for (const id of ['cv1', 'cv2', 'cv3']) {
      const d = newDesign(DEFAULT_CATALOG, id, 'x', 'New carrier');
      expect(validateDesign(DEFAULT_CATALOG, d)).toEqual([]);
      expect(deriveStats(DEFAULT_CATALOG, d).airWing).toBeGreaterThan(0);
    }
  });

  it('every scenario builds without problems', () => {
    for (const sc of SCENARIOS) {
      const { setup, problems } = buildBattleSetup(DEFAULT_CATALOG, PRESET_DESIGNS, sc.fleets, SHIP_NAMES);
      expect(problems, sc.id).toEqual([]);
      expect(setup.sides[0].ships.length).toBeGreaterThan(0);
      expect(setup.sides[1].ships.length).toBeGreaterThan(0);
    }
  });
});

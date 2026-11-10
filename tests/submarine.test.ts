import { describe, expect, it } from 'vitest';
import { PRESET_DESIGNS } from '../src/data/designs';
import {
  createBattle,
  fleetSubDetection,
  hitChance,
  revealChance,
  runBattle,
  step,
  type BattleState,
  type ShipStats,
  type SideSetup,
} from '../src/sim/battle';
import { DEFAULT_CATALOG, deriveStats, modulesForSlot } from '../src/sim/designer';
import { createRng } from '../src/sim/rng';
import { stats, TEST_CONFIG as cfg } from './helpers';

const sub = (o: Partial<ShipStats> = {}) =>
  stats({ line: 'submarine', hp: 20, org: 30, armour: 0, visibility: 5, speed: 15, torpedoAttack: 20, torpedoPiercing: 40, ...o });
const escort = (o: Partial<ShipStats> = {}) =>
  stats({ line: 'screen', hp: 5000, org: 5000, armour: 0, visibility: 8, lightAttack: 10, lightPiercing: 10, ...o });
const side = (name: string, ships: Array<[string, ShipStats]>): SideSetup => ({
  name,
  aggressiveness: 'alwaysEngage',
  ships: ships.map(([n, s]) => ({ name: n, className: s.line, stats: s })),
});

describe('submarine maths', () => {
  it('fleet detection is the best detector plus a share of the rest', () => {
    // test config: 50% of the rest
    expect(fleetSubDetection(cfg, [])).toBe(0);
    expect(fleetSubDetection(cfg, [4])).toBe(4);
    expect(fleetSubDetection(cfg, [4, 2, 2])).toBe(6);
  });

  it('firing makes a submarine much easier to find; detection helps, low visibility hides', () => {
    // test config: passive 0.1, on fire 0.5, +0.01 per detection, -0.02 per visibility
    expect(revealChance(cfg, 0, 0, false)).toBeCloseTo(0.1);
    expect(revealChance(cfg, 0, 0, true)).toBeCloseTo(0.5);
    expect(revealChance(cfg, 10, 0, true)).toBeCloseTo(0.6);
    expect(revealChance(cfg, 10, 5, true)).toBeCloseTo(0.5);
    expect(revealChance(cfg, 0, 100, false)).toBe(cfg.submarines.revealMin);
    expect(revealChance(cfg, 1000, 0, true)).toBe(cfg.submarines.revealMax);
  });

  it('submarines get a close-range bonus with torpedoes only', () => {
    const target = stats();
    expect(hitChance(cfg, 'torpedo', sub(), target)).toBeCloseTo(hitChance(cfg, 'torpedo', stats(), target) + 0.1);
    expect(hitChance(cfg, 'light', sub(), target)).toBeCloseTo(hitChance(cfg, 'light', stats(), target));
  });
});

describe('submarines in battle', () => {
  it('start hidden; surface ships cannot fire at them', () => {
    const setup = { sides: [side('Escorts', [['E', escort()]]), side('Subs', [['U', sub({ torpedoAttack: 0 })]])] as [SideSetup, SideSetup] };
    let s: BattleState = createBattle(setup);
    expect(s.ships[1]!.hidden).toBe(true);
    s = step(s, {}, createRng(1), cfg);
    // The escort has guns but no depth charges, and the sub never fires: nobody can shoot.
    expect(s.ships[0]!.shotsFired).toBe(0);
    expect(s.ships[1]!.hp).toBe(20);
  });

  it('only depth charges can hit a revealed submarine', () => {
    const setup = {
      sides: [side('Escorts', [['E', escort({ aswAttack: 50 })]]), side('Subs', [['U', sub({ torpedoAttack: 0 })]])] as [SideSetup, SideSetup],
    };
    let s = createBattle(setup);
    s = step(s, {}, createRng(1), cfg);
    expect(s.ships[0]!.shotsFired).toBe(0); // still hidden
    s.ships[1]!.hidden = false;
    const rng = createRng(2);
    for (let i = 0; i < 10 && !s.result; i++) s = step(s, {}, rng, cfg);
    expect(s.ships[1]!.status).toBe('sunk');
  });

  it('firing reveals submarines over time, and the log says so', () => {
    const setup = { sides: [side('Escorts', [['E', escort({ aswAttack: 10, subDetection: 5 })]]), side('Subs', [['U', sub()]])] as [SideSetup, SideSetup] };
    let revealedAfterFiring = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const end = runBattle(createBattle(setup), createRng(seed), { ...cfg, maxHours: 40 });
      if (end.log.some((e) => e.type === 'revealed' && e.afterFiring)) revealedAfterFiring++;
    }
    expect(revealedAfterFiring).toBeGreaterThan(20);
  });

  it('subs torpedo surface ships, and fleets that cannot reach each other lose contact', () => {
    const vsSurface = runBattle(
      createBattle({ sides: [side('Escorts', [['E', escort({ hp: 60, org: 60 })]]), side('Subs', [['U', sub()]])] }),
      createRng(1),
      cfg,
    );
    expect(vsSurface.ships[1]!.shotsFired).toBeGreaterThan(0);
    expect(vsSurface.ships[0]!.hp).toBeLessThan(60);

    const subsOnly = runBattle(createBattle({ sides: [side('A', [['a', sub()]]), side('B', [['b', sub()]])] }), createRng(1), cfg);
    expect(subsOnly.result!.reason).toContain('lost contact');
  });

  it('hidden submarines slip away more easily when retreating', () => {
    const run = (hidden: boolean) => {
      let escaped = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const s0 = createBattle({ sides: [side('E', [['E', escort({ speed: 40 })]]), side('U', [['U', sub({ torpedoAttack: 0 })]])] });
        s0.ships[1]!.status = 'retreating';
        s0.ships[1]!.hidden = hidden;
        if (step(s0, {}, createRng(seed), cfg).ships[1]!.status === 'escaped') escaped++;
      }
      return escaped;
    };
    expect(run(true)).toBeGreaterThan(run(false) + 40);
  });
});

describe('submarine designs', () => {
  it('presets are submarines with low visibility, and later ones hide better', () => {
    const vis = ['preset_ss_1905', 'preset_ss_1915', 'preset_ss_1925', 'preset_ss_1938', 'preset_ss_1942'].map((id) => {
      const s = deriveStats(DEFAULT_CATALOG, PRESET_DESIGNS.find((d) => d.id === id)!);
      expect(s.line).toBe('submarine');
      expect(s.torpedoAttack).toBeGreaterThan(0);
      return s.visibility;
    });
    for (let i = 1; i < vis.length; i++) expect(vis[i]).toBeLessThan(vis[i - 1]!);
    expect(vis.at(-1)).toBeLessThanOrEqual(2);
  });

  it('anechoic tiles and snorkels fit only submarines', () => {
    const subHull = DEFAULT_CATALOG.hulls.get('sub5')!;
    const system = subHull.slots.find((s) => s.id === 'custom1')!;
    const ids = modulesForSlot(DEFAULT_CATALOG, subHull, system).map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining(['snorkel', 'anechoic', 'sub_reload']));
    const dd = DEFAULT_CATALOG.hulls.get('dd4')!;
    for (const slot of dd.slots) {
      expect(modulesForSlot(DEFAULT_CATALOG, dd, slot).some((m) => m.category === 'subSystem')).toBe(false);
    }
  });

  it('depth charges give escorts anti-submarine attack', () => {
    const basic = deriveStats(DEFAULT_CATALOG, PRESET_DESIGNS.find((d) => d.id === 'preset_dd_1936')!);
    expect(basic.aswAttack).toBeGreaterThanOrEqual(8);
    expect(basic.subDetection).toBeGreaterThan(0);
    const battleship = deriveStats(DEFAULT_CATALOG, PRESET_DESIGNS.find((d) => d.id === 'preset_bb_1936')!);
    expect(battleship.aswAttack).toBe(0);
  });
});

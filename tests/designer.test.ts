import { describe, expect, it } from 'vitest';
import { PRESET_DESIGNS } from '../src/data/designs';
import { DEFAULT_FLEETS } from '../src/data/scenarios';
import { PRODUCTION } from '../src/data/production';
import { BATTLE_CONFIG } from '../src/data/battle';
import {
  buildBattleSetup,
  changeHull,
  compareStats,
  DEFAULT_CATALOG,
  deriveStats,
  designCost,
  isValidDesign,
  makeCatalog,
  modulesForSlot,
  newDesign,
  setSlot,
  validateDesign,
  type Design,
  type Hull,
  type Module,
} from '../src/sim/designer';
import { createBattle, runBattle } from '../src/sim/battle';
import { createRng } from '../src/sim/rng';

// A tiny catalogue with round numbers so the stat maths can be checked exactly.
const testHull: Hull = {
  id: 'h', name: 'Test Cruiser', hullClass: 'heavyCruiser', line: 'capital', year: 1910,
  hp: 100, org: 40, armour: 5, visibility: 20, speed: 25,
  cost: { production: 1000, steel: 5, chromium: 0 },
  slots: [
    { id: 'fireControl', label: 'Fire control', group: 'fixed', accepts: ['fireControl'], required: true },
    { id: 'engine', label: 'Engine', group: 'fixed', accepts: ['engine'], required: true },
    { id: 'armour', label: 'Armour', group: 'fixed', accepts: ['armour'], required: true },
    { id: 'mainFront', label: 'Main (front)', group: 'main', accepts: ['mediumBattery'], required: true },
    { id: 'mainRear', label: 'Main (rear)', group: 'main', accepts: ['mediumBattery', 'lightBattery'], required: false },
    { id: 'custom1', label: 'Custom 1', group: 'custom', accepts: ['torpedo', 'extraArmour'], required: false },
  ],
};
const mod = (m: Omit<Module, 'cost'> & { production?: number; steel?: number; chromium?: number }): Module => ({
  id: m.id, name: m.name, category: m.category, year: m.year, stats: m.stats,
  cost: { production: m.production ?? 100, steel: m.steel ?? 1, chromium: m.chromium ?? 0 },
  ...(m.hullClasses ? { hullClasses: m.hullClasses } : {}),
});
const testModules: Module[] = [
  mod({ id: 'fc', name: 'FC', category: 'fireControl', year: 1900, stats: { fireControl: 0.05 } }),
  mod({ id: 'eng', name: 'Engine', category: 'engine', year: 1900, stats: { speed: 4 } }),
  mod({ id: 'bbEngine', name: 'BB engine', category: 'engine', year: 1900, stats: { speed: 2 }, hullClasses: ['battleship'] }),
  mod({ id: 'belt', name: 'Belt', category: 'armour', year: 1900, stats: { armour: 10, hp: 20, speed: -1 }, production: 300, steel: 3, chromium: 1 }),
  mod({ id: 'med', name: 'Medium', category: 'mediumBattery', year: 1900, stats: { heavyAttack: 8, heavyPiercing: 15, visibility: 1 } }),
  mod({ id: 'med2', name: 'Medium II', category: 'mediumBattery', year: 1920, stats: { heavyAttack: 10, heavyPiercing: 20, visibility: 1 } }),
  mod({ id: 'light', name: 'Light', category: 'lightBattery', year: 1900, stats: { lightAttack: 4, lightPiercing: 5 } }),
  mod({ id: 'torp', name: 'Torpedo', category: 'torpedo', year: 1900, stats: { torpedoAttack: 12, torpedoPiercing: 40 } }),
  mod({ id: 'xarm', name: 'Extra armour', category: 'extraArmour', year: 1900, stats: { armour: 2, hp: 10, speed: -1 } }),
];
const cat = makeCatalog([testHull], testModules);

const design = (slots: Record<string, string | null>): Design => ({ id: 'd', name: 'Test', role: '', hullId: 'h', slots });
const full = design({ fireControl: 'fc', engine: 'eng', armour: 'belt', mainFront: 'med', mainRear: 'med2', custom1: 'torp' });

describe('derived stats', () => {
  it('adds hull and module stats', () => {
    const s = deriveStats(cat, full);
    expect(s.line).toBe('capital');
    expect(s.hp).toBe(120); // 100 + 20 belt
    expect(s.org).toBe(40);
    expect(s.armour).toBe(15); // 5 + 10
    expect(s.speed).toBe(28); // 25 + 4 - 1
    expect(s.visibility).toBe(22); // 20 + 1 + 1
    expect(s.fireControl).toBeCloseTo(0.05);
  });

  it('sums attack but takes the best piercing', () => {
    const s = deriveStats(cat, full);
    expect(s.heavyAttack).toBe(18); // 8 + 10
    expect(s.heavyPiercing).toBe(20); // max(15, 20)
    expect(s.torpedoAttack).toBe(12);
    expect(s.torpedoPiercing).toBe(40);
    expect(s.lightAttack).toBe(0);
    expect(s.lightPiercing).toBe(0);
  });

  it('empty optional slots add nothing', () => {
    const s = deriveStats(cat, design({ fireControl: 'fc', engine: 'eng', armour: 'belt', mainFront: 'med', mainRear: null, custom1: null }));
    expect(s.heavyAttack).toBe(8);
    expect(s.heavyPiercing).toBe(15);
    expect(s.torpedoAttack).toBe(0);
  });

  it('extra armour trades speed for armour and HP', () => {
    const base = deriveStats(cat, setSlot(full, 'custom1', null));
    const armoured = deriveStats(cat, setSlot(full, 'custom1', 'xarm'));
    expect(armoured.armour - base.armour).toBe(2);
    expect(armoured.hp - base.hp).toBe(10);
    expect(armoured.speed - base.speed).toBe(-1);
  });

  it('compareStats reports per-stat differences', () => {
    const a = deriveStats(cat, setSlot(full, 'mainRear', null));
    const b = deriveStats(cat, full);
    const diff = compareStats(a, b);
    expect(diff.heavyAttack).toBe(10);
    expect(diff.heavyPiercing).toBe(5);
    expect(diff.visibility).toBe(1);
    expect(diff.hp).toBe(0);
  });
});

describe('cost', () => {
  it('adds hull and module production and resources', () => {
    const c = designCost(cat, full);
    // hull 1000 + fc 100 + eng 100 + belt 300 + med 100 + med2 100 + torp 100
    expect(c.production).toBe(1800);
    expect(c.steel).toBe(5 + 1 + 1 + 3 + 1 + 1 + 1);
    expect(c.chromium).toBe(1);
    expect(c.dockyardDays).toBeCloseTo(1800 / PRODUCTION.dockyardOutputPerDay);
    expect(c.daysAtReference).toBe(Math.ceil(1800 / PRODUCTION.dockyardOutputPerDay / PRODUCTION.referenceDockyards));
  });
});

describe('validation', () => {
  it('accepts a complete design', () => {
    expect(validateDesign(cat, full)).toEqual([]);
  });

  it('requires a name', () => {
    expect(validateDesign(cat, { ...full, name: '  ' })).toHaveLength(1);
  });

  it('flags empty required slots', () => {
    const issues = validateDesign(cat, setSlot(full, 'armour', null));
    expect(issues).toEqual([{ slotId: 'armour', message: 'Armour must be filled.' }]);
  });

  it('flags a module in the wrong kind of slot', () => {
    const issues = validateDesign(cat, setSlot(full, 'mainFront', 'light'));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.slotId).toBe('mainFront');
  });

  it('flags a module not allowed on this hull class', () => {
    const issues = validateDesign(cat, setSlot(full, 'engine', 'bbEngine'));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('cannot be fitted');
  });

  it('flags unknown hulls, modules and slots', () => {
    expect(validateDesign(cat, { ...full, hullId: 'nope' })[0]!.message).toContain('Unknown hull');
    expect(validateDesign(cat, setSlot(full, 'custom1', 'nope'))[0]!.message).toContain('Unknown module');
    expect(validateDesign(cat, setSlot(full, 'custom9', 'torp'))[0]!.message).toContain('no slot');
  });

  it('modulesForSlot lists only fitting modules, oldest first', () => {
    const rear = testHull.slots.find((s) => s.id === 'mainRear')!;
    expect(modulesForSlot(cat, testHull, rear).map((m) => m.id)).toEqual(['light', 'med', 'med2']);
    const engine = testHull.slots.find((s) => s.id === 'engine')!;
    expect(modulesForSlot(cat, testHull, engine).map((m) => m.id)).toEqual(['eng']);
  });
});

describe('creating and editing designs', () => {
  it('newDesign fills required slots so it is immediately valid', () => {
    for (const hull of DEFAULT_CATALOG.hulls.values()) {
      const d = newDesign(DEFAULT_CATALOG, hull.id, 'x', 'New');
      expect(validateDesign(DEFAULT_CATALOG, d)).toEqual([]);
    }
  });

  it('newDesign picks modules no newer than the hull', () => {
    const d = newDesign(DEFAULT_CATALOG, 'bb2', 'x', 'New');
    for (const id of Object.values(d.slots)) {
      if (id) expect(DEFAULT_CATALOG.modules.get(id)!.year).toBeLessThanOrEqual(1906);
    }
  });

  it('changeHull keeps modules that still fit and drops the rest', () => {
    const bb = DEFAULT_CATALOG;
    const preset = PRESET_DESIGNS.find((p) => p.id === 'preset_bb_1915')!;
    const moved = changeHull(bb, preset, 'bb4');
    expect(moved.slots.mainFront).toBe('hb3');
    expect(moved.slots.armour).toBe('arm_bb2');
    expect(validateDesign(bb, moved)).toEqual([]);

    const toCruiser = changeHull(bb, preset, 'ca2');
    expect(toCruiser.slots.mainFront).not.toBe('hb3'); // heavy guns do not fit a cruiser
    expect(validateDesign(bb, toCruiser)).toEqual([]);
  });

  it('designs survive a JSON round-trip', () => {
    const d = PRESET_DESIGNS[0]!;
    const back = JSON.parse(JSON.stringify(d)) as Design;
    expect(deriveStats(DEFAULT_CATALOG, back)).toEqual(deriveStats(DEFAULT_CATALOG, d));
  });
});

describe('preset designs', () => {
  it('are all valid with unique ids', () => {
    const ids = new Set<string>();
    for (const d of PRESET_DESIGNS) {
      expect(validateDesign(DEFAULT_CATALOG, d), d.name).toEqual([]);
      expect(ids.has(d.id)).toBe(false);
      ids.add(d.id);
    }
  });

  it('show the intended armour and piercing relationships', () => {
    const s = (id: string) => deriveStats(DEFAULT_CATALOG, PRESET_DESIGNS.find((p) => p.id === id)!);
    const bb = s('preset_bb_1915');
    const cl = s('preset_cl_1915');
    const dd = s('preset_dd_1915');
    expect(cl.lightPiercing).toBeLessThan(bb.armour); // cruiser guns bounce off battleships
    expect(dd.torpedoPiercing).toBeGreaterThanOrEqual(bb.armour); // torpedoes do not
    expect(bb.heavyPiercing).toBeGreaterThanOrEqual(bb.armour); // battleships can hurt each other
    expect(s('preset_bb_1936').heavyPiercing).toBeGreaterThanOrEqual(s('preset_bb_1936').armour);
    expect(dd.speed).toBeGreaterThan(bb.speed);
  });
});

describe('designs in battle', () => {
  it('builds fleets from designs with the derived stats', () => {
    const { setup, problems } = buildBattleSetup(DEFAULT_CATALOG, PRESET_DESIGNS, DEFAULT_FLEETS, [['A', 'B'], []]);
    expect(problems).toEqual([]);
    expect(setup.sides[0].ships).toHaveLength(11);
    expect(setup.sides[1].ships).toHaveLength(10);
    expect(setup.sides[0].ships[0]!.name).toBe('A');
    expect(setup.sides[0].ships[2]!.name).toBe('Heavy cruiser 1915 1'); // names ran out
    const bb = PRESET_DESIGNS.find((p) => p.id === 'preset_bb_1915')!;
    expect(setup.sides[0].ships[0]!.stats).toEqual(deriveStats(DEFAULT_CATALOG, bb));
    expect(setup.sides[0].ships[0]!.hullClass).toBe('battleship');
    expect(createBattle(setup).ships[0]!.hullClass).toBe('battleship');
  });

  it('skips unknown and invalid designs and reports why', () => {
    const broken: Design = { ...PRESET_DESIGNS[0]!, id: 'broken', slots: { ...PRESET_DESIGNS[0]!.slots, engine: null } };
    expect(isValidDesign(DEFAULT_CATALOG, broken)).toBe(false);
    const { setup, problems } = buildBattleSetup(DEFAULT_CATALOG, [...PRESET_DESIGNS, broken], [
      { name: 'A', aggressiveness: 'mediumRisk', ships: [{ designId: 'broken', count: 2 }, { designId: 'preset_dd_1915', count: 1 }] },
      { name: 'B', aggressiveness: 'mediumRisk', ships: [{ designId: 'missing', count: 1 }] },
    ]);
    expect(setup.sides[0].ships).toHaveLength(1);
    expect(setup.sides[1].ships).toHaveLength(0);
    expect(problems).toHaveLength(2);
  });

  it("cruiser guns that cannot pierce a battleship's armour barely scratch it", () => {
    const battleshipHpLost = (lightPiercing?: number) => {
      let lost = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const { setup } = buildBattleSetup(DEFAULT_CATALOG, PRESET_DESIGNS, [
          { name: 'Cruisers', aggressiveness: 'alwaysEngage', ships: [{ designId: 'preset_cl_1915', count: 3 }] },
          { name: 'Battleship', aggressiveness: 'alwaysEngage', ships: [{ designId: 'preset_bb_1915', count: 1 }] },
        ]);
        // Remove the cruisers' torpedoes so only their guns count.
        for (const ship of setup.sides[0].ships) {
          ship.stats.torpedoAttack = 0;
          if (lightPiercing !== undefined) ship.stats.lightPiercing = lightPiercing;
        }
        // Compare the same 24-hour window, since the battle itself runs until one side is gone.
        const end = runBattle(createBattle(setup), createRng(seed), { ...BATTLE_CONFIG, maxHours: 24 });
        const bb = end.ships.find((x) => x.side === 1)!;
        lost += bb.stats.hp - bb.hp;
      }
      return lost;
    };
    const asDesigned = battleshipHpLost();
    const ifTheyPierced = battleshipHpLost(40);
    expect(asDesigned).toBeLessThan(ifTheyPierced * 0.3);
  });
});

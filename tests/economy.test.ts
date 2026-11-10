import { describe, expect, it } from 'vitest';
import { ECONOMY, type EconomyConfig } from '../src/data/economy';
import { PRESET_DESIGNS } from '../src/data/designs';
import { designCost, designYear } from '../src/sim/designer';
import {
  aiCommands,
  applyCommand,
  applyCommands,
  createGame,
  fleetBattleSetup,
  fleetValue,
  freeSlots,
  industryReport,
  infrastructureCost,
  makeContext,
  nationShipStats,
  newestDesign,
  resolveModifiers,
  step,
  wantedLines,
  type EconomyContext,
  type GameState,
  type NationDef,
} from '../src/sim/economy';
import { createRng } from '../src/sim/rng';

// Round numbers so every formula can be checked by hand.
const config: EconomyConfig = {
  ...ECONOMY,
  construction: {
    outputPerFactory: 100,
    maxFactoriesPerProject: 10,
    cost: { civilianFactory: 1000, dockyard: 2000, infrastructure: 500 },
    slotsPerInfrastructure: 2,
    infrastructureCostGrowth: 0.5,
  },
  consumerGoodsShare: 0.25,
  trade: { perFactory: { steel: 10, chromium: 4 } },
  production: {
    maxDockyardsPerLine: { screen: 10, capital: 5, carrier: 5 },
    efficiency: { base: 0.5, max: 1, gainPerMonth: 0.1, retainSameHull: 0.8, retainSameClass: 0.6 },
    resourceShortfallPenalty: 0.6,
  },
};

const nation = (o: Partial<NationDef> = {}): NationDef => ({
  id: 'a', name: 'Aland', adjective: 'Alandic', blurb: '',
  civilianFactories: 20, dockyards: 10, buildingSlots: 32,
  resources: { steel: 100, chromium: 10 },
  startingFleet: {}, traits: [],
  ai: { transitionMonth: 12, fleetMix: { battleship: 2, destroyer: 2 } },
  shipNames: ['Alpha', 'Bravo'],
  ...o,
});

function world(a: Partial<NationDef> = {}): EconomyContext {
  return makeContext({
    config,
    dockyardOutputPerMonth: 100,
    nations: new Map([['a', nation(a)], ['b', nation({ id: 'b', name: 'Bland', adjective: 'Blandic' })]]),
  });
}

const preset = (id: string) => PRESET_DESIGNS.find((d) => d.id === id)!;
const DD = preset('preset_dd_1915'); // cost 1140, 4 steel
const BB = preset('preset_bb_1906'); // cost 10380, 34 steel
const rng = createRng(1);
const newGame = (ctx: EconomyContext, startYear = 1914) => createGame(ctx, { playerId: 'a', rivalId: 'b', startYear });
const month = (ctx: EconomyContext, s: GameState, n = 1) => {
  for (let i = 0; i < n; i++) s = step(s, {}, rng, ctx);
  return s;
};
const ok = (ctx: EconomyContext, s: GameState, cmd: Parameters<typeof applyCommand>[3]) => {
  const r = applyCommand(ctx, s, 'a', cmd);
  expect(r.error).toBeUndefined();
  return r.state;
};

describe('civilian factories', () => {
  it('consumer goods take their share and the rest build', () => {
    const ctx = world();
    const r = industryReport(ctx, newGame(ctx).nations.a!);
    expect(r.consumerGoods).toBe(5); // 25% of 20
    expect(r.constructionFactories).toBe(15);
    expect(r.idleFactories).toBe(15); // nothing queued
  });

  it('a project uses at most 10 factories; the rest go to the next project', () => {
    const ctx = world();
    let s = newGame(ctx);
    s = ok(ctx, s, { type: 'queueBuilding', building: 'dockyard' });
    s = ok(ctx, s, { type: 'queueBuilding', building: 'civilianFactory' });
    const r = industryReport(ctx, s.nations.a!);
    expect(r.factoriesPerItem).toEqual([10, 5]);
    expect(r.idleFactories).toBe(0);
  });

  it('finished buildings join the economy', () => {
    const ctx = world();
    let s = newGame(ctx);
    s = ok(ctx, s, { type: 'queueBuilding', building: 'civilianFactory' }); // 1000 points at 10 * 100 per month
    s = month(ctx, s);
    expect(s.nations.a!.civilianFactories).toBe(21);
    expect(s.nations.a!.construction).toHaveLength(0);
    expect(s.events.some((e) => e.text.includes('Civilian factory completed'))).toBe(true);

    s = ok(ctx, s, { type: 'queueBuilding', building: 'dockyard' }); // 2000 points: two months
    s = month(ctx, s);
    expect(s.nations.a!.dockyards).toBe(10);
    expect(s.nations.a!.construction[0]!.progress).toBe(1000);
    s = month(ctx, s);
    expect(s.nations.a!.dockyards).toBe(11);
  });

  it('trade takes factories away from construction and brings in resources', () => {
    const ctx = world();
    let s = newGame(ctx);
    s = ok(ctx, s, { type: 'setTrade', resource: 'steel', factories: 3 });
    s = ok(ctx, s, { type: 'setTrade', resource: 'chromium', factories: 2 });
    const r = industryReport(ctx, s.nations.a!);
    expect(r.tradeFactories).toBe(5);
    expect(r.constructionFactories).toBe(10);
    expect(r.supply).toEqual({ steel: 130, chromium: 18 });
  });

  it('trade cannot use more factories than are free of consumer goods', () => {
    const ctx = world();
    const s = ok(ctx, newGame(ctx), { type: 'setTrade', resource: 'steel', factories: 99 });
    const r = industryReport(ctx, s.nations.a!);
    expect(r.tradeFactories).toBe(15);
    expect(r.constructionFactories).toBe(0);
  });
});

describe('building slots and infrastructure', () => {
  it('factories and dockyards need a free slot, counting queued ones', () => {
    const ctx = world(); // 30 buildings, 32 slots
    let s = newGame(ctx);
    expect(freeSlots(s.nations.a!)).toBe(2);
    s = ok(ctx, s, { type: 'queueBuilding', building: 'dockyard' });
    s = ok(ctx, s, { type: 'queueBuilding', building: 'civilianFactory' });
    const refused = applyCommand(ctx, s, 'a', { type: 'queueBuilding', building: 'dockyard' });
    expect(refused.error).toContain('No free building slots');
    expect(refused.state).toBe(s);
  });

  it('infrastructure adds slots and each level costs more', () => {
    const ctx = world();
    let s = newGame(ctx);
    expect(infrastructureCost(ctx, s.nations.a!)).toBe(500);
    s = ok(ctx, s, { type: 'queueBuilding', building: 'infrastructure' });
    expect(infrastructureCost(ctx, s.nations.a!)).toBe(750); // one queued: +50%
    s = month(ctx, s);
    expect(s.nations.a!.infrastructure).toBe(1);
    expect(s.nations.a!.buildingSlots).toBe(34);
    expect(infrastructureCost(ctx, s.nations.a!)).toBe(750);
  });

  it('projects can be reordered and cancelled', () => {
    const ctx = world();
    let s = newGame(ctx);
    s = ok(ctx, s, { type: 'queueBuilding', building: 'dockyard' });
    s = ok(ctx, s, { type: 'queueBuilding', building: 'infrastructure' });
    const [first, second] = s.nations.a!.construction;
    s = ok(ctx, s, { type: 'moveBuilding', itemId: second!.id, to: 0 });
    expect(s.nations.a!.construction.map((c) => c.building)).toEqual(['infrastructure', 'dockyard']);
    s = ok(ctx, s, { type: 'cancelBuilding', itemId: first!.id });
    expect(s.nations.a!.construction.map((c) => c.building)).toEqual(['infrastructure']);
  });
});

describe('production lines', () => {
  it('output is dockyards x monthly output x efficiency, and a ship launches when its cost is met', () => {
    const ctx = world();
    let s = ok(ctx, newGame(ctx), { type: 'addLine', design: DD, dockyards: 4 });
    const r = industryReport(ctx, s.nations.a!);
    expect(r.lines[0]).toMatchObject({ assigned: 4, cap: 10, resourceFactor: 1, output: 200, cost: 1140 }); // 4 * 100 * 0.5
    expect(r.lines[0]!.monthsToNext).toBe(6);
    // Efficiency climbs 0.5, 0.6, 0.7, 0.8: 200 + 240 + 280 + 320 = 1040, then 360 more launches the first ship.
    s = month(ctx, s, 4);
    expect(s.nations.a!.fleet).toHaveLength(0);
    expect(s.nations.a!.lines[0]!.progress).toBeCloseTo(1040);
    s = month(ctx, s);
    expect(s.nations.a!.fleet).toHaveLength(1);
    expect(s.nations.a!.fleet[0]).toMatchObject({ name: 'Alpha', launched: { year: 1914, month: 5 } });
    expect(s.nations.a!.lines[0]!.progress).toBeCloseTo(260);
    expect(s.nations.a!.lines[0]!.built).toBe(1);
    expect(s.nations.a!.producedValue).toBe(1140);
    expect(fleetValue(ctx, s.nations.a!)).toBe(1140);
  });

  it('efficiency grows to the cap and no further', () => {
    const ctx = world();
    let s = ok(ctx, newGame(ctx), { type: 'addLine', design: BB, dockyards: 5 });
    s = month(ctx, s, 12);
    expect(s.nations.a!.lines[0]!.efficiency).toBe(1);
  });

  it('a line cannot use more dockyards than its cap', () => {
    const ctx = world();
    let s = ok(ctx, newGame(ctx), { type: 'addLine', design: BB, dockyards: 9 });
    expect(s.nations.a!.lines[0]!.dockyards).toBe(5); // capital ships: 5
    s = ok(ctx, s, { type: 'setLineDockyards', lineId: s.nations.a!.lines[0]!.id, dockyards: 50 });
    expect(s.nations.a!.lines[0]!.dockyards).toBe(5);
  });

  it('dockyards go to lines in priority order', () => {
    const ctx = world(); // 10 dockyards
    let s = newGame(ctx);
    s = ok(ctx, s, { type: 'addLine', design: BB, dockyards: 5 });
    s = ok(ctx, s, { type: 'addLine', design: DD, dockyards: 4 });
    s = ok(ctx, s, { type: 'addLine', design: DD, dockyards: 4 });
    let r = industryReport(ctx, s.nations.a!);
    expect(r.lines.map((l) => l.assigned)).toEqual([5, 4, 1]);
    expect(r.idleDockyards).toBe(0);
    s = ok(ctx, s, { type: 'moveLine', lineId: s.nations.a!.lines[2]!.id, to: 0 });
    r = industryReport(ctx, s.nations.a!);
    expect(r.lines.map((l) => l.assigned)).toEqual([4, 5, 1]);
  });

  it('a steel shortfall slows the lines at the back of the queue', () => {
    const ctx = world({ resources: { steel: 36, chromium: 0 } });
    let s = newGame(ctx);
    s = ok(ctx, s, { type: 'addLine', design: BB, dockyards: 5 }); // needs 34 steel
    s = ok(ctx, s, { type: 'addLine', design: DD, dockyards: 4 }); // needs 4, gets 2
    const r = industryReport(ctx, s.nations.a!);
    expect(r.demand.steel).toBe(38);
    expect(r.lines[0]!.resourceFactor).toBe(1);
    expect(r.lines[1]!.resourceFactor).toBeCloseTo(0.7); // 1 - 0.6 * (1 - 2/4)
    expect(r.lines[1]!.output).toBeCloseTo(4 * 100 * 0.5 * 0.7);
  });

  it('an order with a quantity closes the line when complete', () => {
    const ctx = world();
    let s = ok(ctx, newGame(ctx), { type: 'addLine', design: DD, dockyards: 10, quantity: 2 });
    s = month(ctx, s, 6);
    expect(s.nations.a!.fleet).toHaveLength(2);
    expect(s.nations.a!.lines).toHaveLength(0);
    expect(s.nations.a!.fleet.map((x) => x.name)).toEqual(['Alpha', 'Bravo']);
  });

  it('names fall back to the class name when the list runs out', () => {
    const ctx = world();
    let s = ok(ctx, newGame(ctx), { type: 'addLine', design: DD, dockyards: 10, quantity: 3 });
    s = month(ctx, s, 8);
    expect(s.nations.a!.fleet[2]!.name).toBe('Destroyer 1915 3');
  });

  it('adding dockyards dilutes efficiency; retooling keeps part of it', () => {
    const ctx = world();
    let s = ok(ctx, newGame(ctx), { type: 'addLine', design: DD, dockyards: 2 });
    s = month(ctx, s, 5); // efficiency 1.0
    const id = s.nations.a!.lines[0]!.id;
    const expanded = ok(ctx, s, { type: 'setLineDockyards', lineId: id, dockyards: 4 });
    expect(expanded.nations.a!.lines[0]!.efficiency).toBeCloseTo(0.75); // (2 * 1.0 + 2 * 0.5) / 4

    const variant = { ...DD, id: 'variant', name: 'Destroyer variant' };
    const sameHull = ok(ctx, s, { type: 'setLineDesign', lineId: id, design: variant });
    expect(sameHull.nations.a!.lines[0]!.efficiency).toBeCloseTo(0.8);
    expect(sameHull.nations.a!.lines[0]!.progress).toBe(s.nations.a!.lines[0]!.progress);

    const otherClass = ok(ctx, s, { type: 'setLineDesign', lineId: id, design: BB });
    expect(otherClass.nations.a!.lines[0]!.efficiency).toBe(0.5);
    expect(otherClass.nations.a!.lines[0]!.progress).toBe(0);
  });

  it('refuses designs that are invalid or use technology from the future', () => {
    const ctx = world();
    const s = newGame(ctx, 1914);
    const future = applyCommand(ctx, s, 'a', { type: 'addLine', design: preset('preset_bb_1936'), dockyards: 5 });
    expect(future.error).toContain(`technology from ${designYear(ctx.catalog, preset('preset_bb_1936'))}`);
    const broken = applyCommand(ctx, s, 'a', { type: 'addLine', design: { ...DD, slots: { ...DD.slots, engine: null } }, dockyards: 2 });
    expect(broken.error).toContain('Engine must be filled');
    expect(broken.state).toBe(s);
  });

  it('a line keeps its own copy of the design', () => {
    const ctx = world();
    const mine = structuredClone(DD);
    const s = ok(ctx, newGame(ctx), { type: 'addLine', design: mine, dockyards: 2 });
    mine.slots.custom1 = null;
    expect(s.nations.a!.lines[0]!.design.slots.custom1).toBe('torp2');
  });
});

describe('monthly step', () => {
  it('advances the date and rolls over the year', () => {
    const ctx = world();
    let s = newGame(ctx, 1914);
    expect(s.date).toEqual({ year: 1914, month: 1 });
    s = month(ctx, s, 12);
    expect(s.date).toEqual({ year: 1915, month: 1 });
    expect(s.turn).toBe(12);
  });

  it('does not mutate its input and applies orders for each nation', () => {
    const ctx = world();
    const s0 = newGame(ctx);
    const snapshot = structuredClone(s0);
    const s1 = step(s0, { a: [{ type: 'queueBuilding', building: 'dockyard' }], b: [{ type: 'addLine', design: DD, dockyards: 3 }] }, rng, ctx);
    expect(s0).toEqual(snapshot);
    expect(s1.nations.a!.construction).toHaveLength(1);
    expect(s1.nations.b!.lines).toHaveLength(1);
  });

  it('is deterministic and survives a JSON round-trip', () => {
    const ctx = world();
    const play = (s: GameState, months: number) => {
      for (let i = 0; i < months; i++) s = step(s, { a: aiCommands(ctx, s, 'a'), b: aiCommands(ctx, s, 'b') }, rng, ctx);
      return s;
    };
    const mid = play(newGame(ctx), 20);
    const direct = play(mid, 20);
    const resumed = play(JSON.parse(JSON.stringify(mid)) as GameState, 20);
    expect(resumed).toEqual(direct);
    expect(direct.nations.a!.fleet.length).toBeGreaterThan(0);
  });
});

describe('starting position', () => {
  it('starts with the nation definition and a fleet of the newest designs for that year', () => {
    const ctx = world({ startingFleet: { battleship: 2, destroyer: 3, carrier: 1 } });
    const early = newGame(ctx, 1906).nations.a!;
    expect(early.civilianFactories).toBe(20);
    expect(early.dockyards).toBe(10);
    // No destroyer preset newer than 1895 exists in 1906, and no carrier at all.
    expect(early.fleet.map((x) => x.design.id)).toEqual([
      'preset_bb_1906', 'preset_bb_1906', 'preset_dd_1895', 'preset_dd_1895', 'preset_dd_1895',
    ]);
    const late = newGame(ctx, 1936).nations.a!;
    expect(late.fleet.some((x) => x.design.id === 'preset_cv_1940')).toBe(true);
    expect(late.fleet.some((x) => x.design.id === 'preset_dd_1936')).toBe(true);
  });

  it('newestDesign respects the year', () => {
    const ctx = world();
    expect(newestDesign(ctx, 'carrier', 1920)).toBeUndefined();
    expect(newestDesign(ctx, 'carrier', 1930)?.id).toBe('preset_cv_1924');
    expect(newestDesign(ctx, 'battleship', 1890)?.id).toBe('preset_bb_1895');
  });
});

describe('nation traits', () => {
  it('add up, and inactive traits are ignored', () => {
    const def = nation({
      traits: [
        { id: 't1', name: '', description: '', kind: 'strength', modifiers: { dockyardOutput: { destroyer: 0.2 }, consumerGoods: 0.05 } },
        { id: 't2', name: '', description: '', kind: 'strength', modifiers: { dockyardOutput: { destroyer: 0.1, all: 0.1 }, shipStats: { torpedoAttack: 0.5 } } },
        { id: 't3', name: '', description: '', kind: 'strength', modifiers: { dockyardOutput: { submarine: 0.3 } }, inactive: 'no submarines yet' },
      ],
    });
    const m = resolveModifiers(def);
    expect(m.dockyardOutput.destroyer).toBeCloseTo(0.3);
    expect(m.dockyardOutput.all).toBeCloseTo(0.1);
    expect(m.dockyardOutput.submarine).toBeUndefined();
    expect(m.consumerGoods).toBeCloseTo(0.05);
    expect(m.shipStats.torpedoAttack).toBe(0.5);
  });

  it('change dockyard output, construction speed, consumer goods and trade', () => {
    const ctx = world({
      traits: [{
        id: 't', name: '', description: '', kind: 'strength',
        modifiers: {
          dockyardOutput: { destroyer: 0.25 },
          constructionSpeed: { dockyard: 0.5 },
          consumerGoods: 0.1,
          tradeYield: 0.5,
          lineEfficiencyGain: 1,
        },
      }],
    });
    let s = ok(ctx, newGame(ctx), { type: 'addLine', design: DD, dockyards: 4 });
    s = ok(ctx, s, { type: 'setTrade', resource: 'steel', factories: 2 });
    s = ok(ctx, s, { type: 'queueBuilding', building: 'dockyard' });
    const r = industryReport(ctx, s.nations.a!);
    expect(r.consumerGoods).toBe(7); // 35% of 20
    expect(r.supply.steel).toBe(130); // 2 factories * 10 * 1.5
    expect(r.lines[0]!.output).toBeCloseTo(4 * 100 * 0.5 * 1.25);
    s = month(ctx, s);
    expect(s.nations.a!.construction[0]!.progress).toBe(1500); // 10 factories * 100 * 1.5 towards a 2000-point dockyard
    expect(s.nations.a!.lines[0]!.efficiency).toBeCloseTo(0.7); // gain doubled
  });

  it('ship-stat traits change the ships that go into battle', () => {
    const ctx = world({ traits: [{ id: 't', name: '', description: '', kind: 'strength', modifiers: { shipStats: { torpedoAttack: 0.15, hp: 0.1 } } }] });
    const plain = world();
    const a = nationShipStats(ctx, ctx.nations.get('a')!, DD);
    const b = nationShipStats(plain, plain.nations.get('a')!, DD);
    expect(a.torpedoAttack).toBeCloseTo(b.torpedoAttack * 1.15, 1);
    expect(a.hp).toBeCloseTo(b.hp * 1.1, 1);
    expect(a.lightAttack).toBe(b.lightAttack);
  });
});

describe('AI and fleets', () => {
  it('the AI uses every dockyard and concentrates on few big-ship lines', () => {
    const ctx = world({ ai: { transitionMonth: 0, fleetMix: { battleship: 2, battlecruiser: 1, heavyCruiser: 1, destroyer: 2 } } });
    const s = newGame(ctx, 1914);
    const lines = wantedLines(ctx, s.nations.a!, ctx.nations.get('a')!.ai, 1914);
    expect(lines.reduce((n, l) => n + l.dockyards, 0)).toBe(10);
    for (const l of lines) {
      const hull = ctx.catalog.hulls.get(l.design.hullId)!;
      if (hull.line !== 'screen') expect(l.dockyards).toBeGreaterThanOrEqual(3);
    }
  });

  it('the AI builds factories before its transition month and dockyards after', () => {
    const ctx = world({ buildingSlots: 60 });
    let s = newGame(ctx);
    const kinds = (st: GameState) => aiCommands(ctx, st, 'a').filter((c) => c.type === 'queueBuilding').map((c) => (c as { building: string }).building);
    expect(new Set(kinds(s))).toEqual(new Set(['civilianFactory']));
    s = { ...s, turn: 12 };
    expect(new Set(kinds(s))).toEqual(new Set(['dockyard']));
  });

  it('the AI builds infrastructure when it runs out of slots', () => {
    const ctx = world({ buildingSlots: 30 });
    const cmds = aiCommands(ctx, newGame(ctx), 'a');
    expect(cmds.some((c) => c.type === 'queueBuilding' && c.building === 'infrastructure')).toBe(true);
    expect(cmds.some((c) => c.type === 'queueBuilding' && c.building !== 'infrastructure')).toBe(false);
  });

  it('every AI command is accepted', () => {
    const ctx = world();
    let s = newGame(ctx);
    for (let i = 0; i < 36; i++) {
      for (const cmd of aiCommands(ctx, s, 'a')) expect(applyCommand(ctx, s, 'a', cmd).error).toBeUndefined();
      s = step(s, { a: aiCommands(ctx, s, 'a') }, rng, ctx);
    }
    expect(s.nations.a!.fleet.length).toBeGreaterThan(0);
  });

  it('whole fleets can be sent into a battle', () => {
    const ctx = world({ startingFleet: { battleship: 2, destroyer: 4 } });
    const s = applyCommands(ctx, newGame(ctx), 'a', [{ type: 'setAggressiveness', aggressiveness: 'highRisk' }]);
    const setup = fleetBattleSetup(ctx, s, 'a', 'b');
    expect(setup.sides[0].name).toBe('Alandic Navy');
    expect(setup.sides[0].aggressiveness).toBe('highRisk');
    expect(setup.sides[0].ships).toHaveLength(6);
    expect(setup.sides[0].ships[0]).toMatchObject({ className: 'Super-dreadnought 1914', hullClass: 'battleship' });
    expect(setup.sides[1].ships).toHaveLength(0);
    expect(designCost(ctx.catalog, BB).production).toBe(10380);
  });
});

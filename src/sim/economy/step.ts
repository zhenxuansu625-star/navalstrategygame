/**
 * The monthly turn. `step(state, orders, rng)` applies each nation's commands,
 * then runs construction and production for the month. It never mutates its input.
 */
import { BUILDING_NAMES } from '../../data/economy';
import { designCost, designYear } from '../designer/stats';
import type { Design, HullClass } from '../designer/types';
import type { Rng } from '../rng';
import { applyCommands } from './commands';
import { DEFAULT_CONTEXT, nationDef, resolveModifiers, type EconomyContext } from './context';
import { industryReport } from './industry';
import type { GameDate, GameEvent, GameState, NationDef, NationState, Orders, ShipRecord } from './types';

export function nextDate(d: GameDate): GameDate {
  return d.month >= 12 ? { year: d.year + 1, month: 1 } : { year: d.year, month: d.month + 1 };
}

/** The newest preset of a hull class that can be built in `year`, or undefined. */
export function newestDesign(ctx: EconomyContext, hullClass: HullClass, year: number): Design | undefined {
  let best: Design | undefined;
  let bestYear = -Infinity;
  for (const d of ctx.presets) {
    if (ctx.catalog.hulls.get(d.hullId)?.hullClass !== hullClass) continue;
    const y = designYear(ctx.catalog, d);
    if (y <= year && y >= bestYear) {
      best = d;
      bestYear = y;
    }
  }
  return best;
}

function shipName(def: NationDef, nation: NationState, design: Design): string {
  const used = new Set(nation.fleet.map((s) => s.name));
  const free = def.shipNames.find((n) => !used.has(n));
  if (free) return free;
  let n = nation.fleet.filter((s) => s.design.name === design.name).length + 1;
  while (used.has(`${design.name} ${n}`)) n++;
  return `${design.name} ${n}`;
}

function launch(def: NationDef, nation: NationState, design: Design, date: GameDate): ShipRecord {
  const ship: ShipRecord = { id: `s${nation.nextId}`, name: shipName(def, nation, design), design, launched: date };
  nation.nextId += 1;
  nation.fleet.push(ship);
  return ship;
}

export interface NewGameOptions {
  playerId: string;
  rivalId: string;
  startYear: number;
}

function createNation(ctx: EconomyContext, id: string, date: GameDate): NationState {
  const def = nationDef(ctx, id);
  const nation: NationState = {
    id,
    civilianFactories: def.civilianFactories,
    dockyards: def.dockyards,
    infrastructure: 0,
    buildingSlots: def.buildingSlots,
    resources: { ...def.resources },
    trade: { steel: 0, chromium: 0 },
    construction: [],
    lines: [],
    fleet: [],
    nextId: 1,
    producedValue: 0,
    aggressiveness: 'mediumRisk',
  };
  for (const [hullClass, count] of Object.entries(def.startingFleet) as [HullClass, number][]) {
    const design = newestDesign(ctx, hullClass, date.year);
    if (!design) continue;
    for (let i = 0; i < count; i++) launch(def, nation, structuredClone(design), date);
  }
  return nation;
}

export function createGame(ctx: EconomyContext, opts: NewGameOptions): GameState {
  if (opts.playerId === opts.rivalId) throw new Error('Player and rival must be different nations.');
  const date: GameDate = { year: opts.startYear, month: 1 };
  return {
    date,
    turn: 0,
    playerId: opts.playerId,
    rivalId: opts.rivalId,
    nations: {
      [opts.playerId]: createNation(ctx, opts.playerId, date),
      [opts.rivalId]: createNation(ctx, opts.rivalId, date),
    },
    events: [],
  };
}

/** Run one nation's month in place (on a copy made by `step`). */
function runMonth(ctx: EconomyContext, nation: NationState, date: GameDate, events: GameEvent[]): void {
  const cfg = ctx.config;
  const def = nationDef(ctx, nation.id);
  const mods = resolveModifiers(def);
  const report = industryReport(ctx, nation);
  const say = (text: string) => events.push({ date, nationId: nation.id, text });

  // Construction queue.
  const stillBuilding = [];
  for (let i = 0; i < nation.construction.length; i++) {
    const item = nation.construction[i]!;
    const speed = Math.max(0, 1 + mods.constructionSpeed[item.building]);
    item.progress += (report.factoriesPerItem[i] ?? 0) * cfg.construction.outputPerFactory * speed;
    if (item.progress < item.cost) {
      stillBuilding.push(item);
      continue;
    }
    if (item.building === 'civilianFactory') nation.civilianFactories += 1;
    else if (item.building === 'dockyard') nation.dockyards += 1;
    else {
      nation.infrastructure += 1;
      nation.buildingSlots += cfg.construction.slotsPerInfrastructure;
    }
    say(`${BUILDING_NAMES[item.building]} completed.`);
  }
  nation.construction = stillBuilding;

  // Production lines.
  const eff = cfg.production.efficiency;
  const running = [];
  for (let i = 0; i < nation.lines.length; i++) {
    const line = nation.lines[i]!;
    const r = report.lines[i]!;
    line.progress += r.output;
    let finished = false;
    while (line.progress >= r.cost && !finished) {
      line.progress -= r.cost;
      line.built += 1;
      nation.producedValue += r.cost;
      const ship = launch(def, nation, line.design, date);
      say(`${ship.name} (${line.design.name}) launched.`);
      if (line.quantity !== null && line.built >= line.quantity) finished = true;
    }
    if (finished) {
      say(`Production line for ${line.design.name} completed its order of ${line.quantity}.`);
      continue;
    }
    if (r.assigned > 0) {
      line.efficiency = Math.min(eff.max, line.efficiency + eff.gainPerMonth * Math.max(0, 1 + mods.lineEfficiencyGain));
    }
    running.push(line);
  }
  nation.lines = running;
}

export function step(state: GameState, orders: Orders, _rng: Rng, ctx: EconomyContext = DEFAULT_CONTEXT): GameState {
  let next: GameState = state;
  for (const nationId of Object.keys(state.nations)) {
    next = applyCommands(ctx, next, nationId, orders[nationId] ?? []);
  }
  next = structuredClone(next);
  const events: GameEvent[] = [];
  for (const nationId of Object.keys(next.nations)) runMonth(ctx, next.nations[nationId]!, next.date, events);
  next.events = [...next.events, ...events].slice(-ctx.config.eventLogLength);
  next.date = nextDate(next.date);
  next.turn += 1;
  return next;
}

/** Total production cost of a nation's fleet. */
export function fleetValue(ctx: EconomyContext, nation: NationState): number {
  let total = 0;
  for (const ship of nation.fleet) total += designCost(ctx.catalog, ship.design).production;
  return total;
}

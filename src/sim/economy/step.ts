/**
 * The campaign turn. `stepDay(state, orders, rng)` runs one day; `step` runs a
 * whole month (the design doc's "monthly turn"). A month's construction,
 * production and repair are spread evenly over its days, so the totals for a
 * month are the same whichever you use. Neither mutates its input.
 */
import { BUILDING_NAMES } from '../../data/economy';
import type { BattleState } from '../battle/types';
import { designCost, designYear } from '../designer/stats';
import type { Design, HullClass } from '../designer/types';
import type { Rng } from '../rng';
import { applyCommands, queueFillCommands } from './commands';
import { DEFAULT_CONTEXT, nationDef, resolveModifiers, type EconomyContext } from './context';
import { nationShipStats } from './fleet';
import { industryReport } from './industry';
import type { GameDate, GameEvent, GameState, NationDef, NationState, Orders, ShipRecord } from './types';

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function nextDate(d: GameDate): GameDate {
  return d.month >= 12 ? { year: d.year + 1, month: 1, day: 1 } : { year: d.year, month: d.month + 1, day: 1 };
}

export function nextDay(d: GameDate): GameDate {
  const day = d.day ?? 1;
  return day >= daysInMonth(d.year, d.month) ? nextDate(d) : { year: d.year, month: d.month, day: day + 1 };
}

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

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
  /** Era names, e.g. Russia as the Soviet Union. */
  names?: Record<string, { name?: string; adjective?: string }>;
}

function createNation(ctx: EconomyContext, id: string, date: GameDate, names?: { name?: string; adjective?: string }): NationState {
  const def = nationDef(ctx, id);
  const nation: NationState = {
    id,
    ...(names?.name ? { name: names.name } : {}),
    ...(names?.adjective ? { adjective: names.adjective } : {}),
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
  const date: GameDate = { year: opts.startYear, month: 1, day: 1 };
  return {
    date,
    turn: 0,
    playerId: opts.playerId,
    rivalId: opts.rivalId,
    nations: {
      [opts.playerId]: createNation(ctx, opts.playerId, date, opts.names?.[opts.playerId]),
      [opts.rivalId]: createNation(ctx, opts.rivalId, date, opts.names?.[opts.rivalId]),
    },
    events: [],
  };
}

/** Bring a campaign saved by an older version up to date (it had no days). */
export function migrateGame(state: GameState): GameState {
  if (state.date.day !== undefined) return state;
  return { ...state, date: { ...state.date, day: 1 } };
}

/** Display name and adjective, including era names. */
export function nationName(ctx: EconomyContext, state: GameState, id: string): { name: string; adjective: string } {
  const def = nationDef(ctx, id);
  const n = state.nations[id];
  return { name: n?.name ?? def.name, adjective: n?.adjective ?? def.adjective };
}

/* ------------------------------------------------------------------ */
/* Ship condition                                                      */
/* ------------------------------------------------------------------ */

/** Maximum HP and organisation of a ship as this nation builds it. */
export function shipMax(ctx: EconomyContext, nationId: string, ship: ShipRecord): { hp: number; org: number } {
  const s = nationShipStats(ctx, nationDef(ctx, nationId), ship.design);
  return { hp: s.hp, org: s.org };
}

export const isDamaged = (ship: ShipRecord) => ship.hp !== undefined;

/** Repair berths: how many ships can be in dock at once. */
export function repairBerths(ctx: EconomyContext, nation: NationState): number {
  const r = ctx.config.repair;
  return Math.max(r.minBerths, Math.floor(nation.dockyards / r.dockyardsPerBerth));
}

/** Ships actually in dock (the first repairing ships, up to the number of berths). */
export function shipsInDock(ctx: EconomyContext, nation: NationState): ShipRecord[] {
  return nation.fleet.filter((s) => s.repairing && isDamaged(s)).slice(0, repairBerths(ctx, nation));
}

/* ------------------------------------------------------------------ */
/* One day                                                             */
/* ------------------------------------------------------------------ */

function runDay(ctx: EconomyContext, nation: NationState, date: GameDate, events: GameEvent[]): void {
  const cfg = ctx.config;
  const def = nationDef(ctx, nation.id);
  const mods = resolveModifiers(def);
  const report = industryReport(ctx, nation);
  const share = 1 / daysInMonth(date.year, date.month);
  const say = (kind: GameEvent['kind'], text: string) => events.push({ date, nationId: nation.id, kind, text });
  const EPS = 1e-6;

  // Construction queue.
  const stillBuilding = [];
  for (let i = 0; i < nation.construction.length; i++) {
    const item = nation.construction[i]!;
    const speed = Math.max(0, 1 + mods.constructionSpeed[item.building]);
    item.progress += (report.factoriesPerItem[i] ?? 0) * cfg.construction.outputPerFactory * speed * share;
    if (item.progress < item.cost - EPS) {
      stillBuilding.push(item);
      continue;
    }
    if (item.building === 'civilianFactory') nation.civilianFactories += 1;
    else if (item.building === 'dockyard') nation.dockyards += 1;
    else {
      nation.infrastructure += 1;
      nation.buildingSlots += cfg.construction.slotsPerInfrastructure;
    }
    say('building', `${BUILDING_NAMES[item.building]} completed.`);
  }
  nation.construction = stillBuilding;

  // Production lines.
  const running = [];
  for (let i = 0; i < nation.lines.length; i++) {
    const line = nation.lines[i]!;
    const r = report.lines[i]!;
    line.progress += r.output * share;
    let finished = false;
    while (line.progress >= r.cost - EPS && !finished) {
      line.progress = Math.max(0, line.progress - r.cost);
      line.built += 1;
      nation.producedValue += r.cost;
      const ship = launch(def, nation, line.design, date);
      say('launch', `${ship.name} (${line.design.name}) launched.`);
      if (line.quantity !== null && line.built >= line.quantity) finished = true;
    }
    if (finished) {
      say('order', `Production line for ${line.design.name} completed its order of ${line.quantity}.`);
      continue;
    }
    running.push(line);
  }
  nation.lines = running;

  // Repairs in dock, and organisation recovering everywhere.
  const inDock = new Set(shipsInDock(ctx, nation).map((s) => s.id));
  for (const ship of nation.fleet) {
    if (!isDamaged(ship) && ship.org === undefined) {
      if (ship.repairing) delete ship.repairing;
      continue;
    }
    const max = shipMax(ctx, nation.id, ship);
    if (ship.org !== undefined) {
      ship.org += max.org * cfg.repair.orgPerMonth * share;
      if (ship.org >= max.org - EPS) delete ship.org;
    }
    if (ship.hp !== undefined && inDock.has(ship.id)) {
      ship.hp += max.hp * cfg.repair.hpPerMonth * share;
      if (ship.hp >= max.hp - EPS) {
        delete ship.hp;
        delete ship.repairing;
        say('repair', `${ship.name} has completed repairs.`);
      }
    }
  }
}

/** Efficiency grows once a month for lines that had dockyards. */
function endOfMonth(ctx: EconomyContext, nation: NationState): void {
  const eff = ctx.config.production.efficiency;
  const mods = resolveModifiers(nationDef(ctx, nation.id));
  const report = industryReport(ctx, nation);
  nation.lines.forEach((line, i) => {
    if (report.lines[i]!.assigned > 0) {
      line.efficiency = Math.min(eff.max, line.efficiency + eff.gainPerMonth * Math.max(0, 1 + mods.lineEfficiencyGain));
    }
  });
}

function applyOrders(ctx: EconomyContext, state: GameState, orders: Orders): GameState {
  let next = state;
  for (const nationId of Object.keys(state.nations)) {
    next = applyCommands(ctx, next, nationId, orders[nationId] ?? []);
    const standing = next.nations[nationId]!.autoBuild;
    if (standing) next = applyCommands(ctx, next, nationId, queueFillCommands(ctx, next.nations[nationId]!, standing));
  }
  return next;
}

/** Advance a state (already copied) by one day, in place. */
function advanceDay(ctx: EconomyContext, next: GameState, events: GameEvent[]): void {
  for (const nationId of Object.keys(next.nations)) runDay(ctx, next.nations[nationId]!, next.date, events);
  const tomorrow = nextDay(next.date);
  if (tomorrow.month !== next.date.month) {
    for (const nationId of Object.keys(next.nations)) endOfMonth(ctx, next.nations[nationId]!);
    next.turn += 1;
  }
  next.date = tomorrow;
}

/** One day of the campaign. */
export function stepDay(state: GameState, orders: Orders, _rng: Rng, ctx: EconomyContext = DEFAULT_CONTEXT): GameState {
  const next = structuredClone(applyOrders(ctx, migrateGame(state), orders));
  const events: GameEvent[] = [];
  advanceDay(ctx, next, events);
  next.events = [...next.events, ...events].slice(-ctx.config.eventLogLength);
  return next;
}

/** One month: orders apply on the first day, then every day of the month runs. */
export function step(state: GameState, orders: Orders, _rng: Rng, ctx: EconomyContext = DEFAULT_CONTEXT): GameState {
  const next = structuredClone(applyOrders(ctx, migrateGame(state), orders));
  const events: GameEvent[] = [];
  const startTurn = next.turn;
  while (next.turn === startTurn) advanceDay(ctx, next, events);
  next.events = [...next.events, ...events].slice(-ctx.config.eventLogLength);
  return next;
}

/* ------------------------------------------------------------------ */
/* Battles                                                             */
/* ------------------------------------------------------------------ */

/**
 * Write a finished battle back into the campaign: sunk ships are lost, every
 * other ship keeps the damage and organisation it ended with.
 */
export function applyBattleResult(ctx: EconomyContext, state: GameState, battle: BattleState, nationIds: [string, string]): GameState {
  const next = structuredClone(state);
  const date = next.date;
  const events: GameEvent[] = [];
  battle.sides.forEach((_, sideIndex) => {
    const nationId = nationIds[sideIndex]!;
    const nation = next.nations[nationId];
    if (!nation) return;
    const byRef = new Map(battle.ships.filter((s) => s.side === sideIndex && s.refId).map((s) => [s.refId!, s]));
    const lost: string[] = [];
    nation.fleet = nation.fleet.filter((ship) => {
      const result = byRef.get(ship.id);
      if (!result) return true;
      if (result.status === 'sunk') {
        lost.push(ship.name);
        return false;
      }
      const max = shipMax(ctx, nationId, ship);
      if (result.hp < max.hp - 1e-6) ship.hp = result.hp;
      else delete ship.hp;
      if (result.org < max.org - 1e-6) ship.org = result.org;
      else delete ship.org;
      return true;
    });
    const { name } = nationName(ctx, next, nationId);
    const fought = byRef.size;
    events.push({
      date,
      nationId,
      kind: 'battle',
      text:
        lost.length > 0
          ? `${name} fought with ${fought} ships and lost ${lost.length}: ${lost.join(', ')}.`
          : `${name} fought with ${fought} ships and lost none.`,
    });
  });
  next.events = [...next.events, ...events].slice(-ctx.config.eventLogLength);
  return next;
}

/** Total production cost of a nation's fleet. */
export function fleetValue(ctx: EconomyContext, nation: NationState): number {
  let total = 0;
  for (const ship of nation.fleet) total += designCost(ctx.catalog, ship.design).production;
  return total;
}

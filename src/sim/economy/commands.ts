/** Player and AI commands. Each returns a new state, or the same state with an error. */
import { AGGRESSIVENESS } from '../../data/battle';
import { designYear } from '../designer/stats';
import type { Design } from '../designer/types';
import { validateDesign } from '../designer/validate';
import type { EconomyContext } from './context';
import { freeSlots, industryReport, infrastructureCost, lineCap } from './industry';
import type { BuildingType, Command, GameState, NationState } from './types';

export interface CommandResult {
  state: GameState;
  /** Why the command was refused; the state is unchanged. */
  error?: string;
}

/** Whether a design can be ordered this year, and if not, why. */
export function designProblem(ctx: EconomyContext, design: Design, year: number): string | null {
  const issues = validateDesign(ctx.catalog, design);
  if (issues.length > 0) return issues[0]!.message;
  const techYear = designYear(ctx.catalog, design);
  if (techYear > year) return `Uses technology from ${techYear}.`;
  return null;
}

function move<T>(list: T[], from: number, to: number): T[] {
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, item!);
  return out;
}

export function applyCommand(ctx: EconomyContext, state: GameState, nationId: string, cmd: Command): CommandResult {
  const nation = state.nations[nationId];
  if (!nation) return { state, error: `Unknown nation ${nationId}.` };
  const fail = (error: string): CommandResult => ({ state, error });
  const done = (next: NationState): CommandResult => ({ state: { ...state, nations: { ...state.nations, [nationId]: next } } });
  const cfg = ctx.config;

  switch (cmd.type) {
    case 'queueBuilding': {
      if (cmd.building !== 'infrastructure' && freeSlots(nation) <= 0) {
        return fail('No free building slots: build infrastructure first.');
      }
      const cost = cmd.building === 'infrastructure' ? infrastructureCost(ctx, nation) : cfg.construction.cost[cmd.building];
      const item = { id: `c${nation.nextId}`, building: cmd.building, cost, progress: 0 };
      return done({ ...nation, nextId: nation.nextId + 1, construction: [...nation.construction, item] });
    }
    case 'cancelBuilding': {
      if (!nation.construction.some((c) => c.id === cmd.itemId)) return fail('That project is not in the queue.');
      return done({ ...nation, construction: nation.construction.filter((c) => c.id !== cmd.itemId) });
    }
    case 'moveBuilding': {
      const from = nation.construction.findIndex((c) => c.id === cmd.itemId);
      if (from < 0) return fail('That project is not in the queue.');
      return done({ ...nation, construction: move(nation.construction, from, cmd.to) });
    }
    case 'addLine': {
      const problem = designProblem(ctx, cmd.design, state.date.year);
      if (problem) return fail(`${cmd.design.name} cannot be built: ${problem}`);
      const cap = lineCap(ctx, cmd.design);
      const line = {
        id: `l${nation.nextId}`,
        design: structuredClone(cmd.design),
        dockyards: Math.max(0, Math.min(cap, Math.floor(cmd.dockyards))),
        efficiency: cfg.production.efficiency.base,
        progress: 0,
        built: 0,
        quantity: cmd.quantity ?? null,
      };
      return done({ ...nation, nextId: nation.nextId + 1, lines: [...nation.lines, line] });
    }
    case 'removeLine': {
      if (!nation.lines.some((l) => l.id === cmd.lineId)) return fail('That production line does not exist.');
      return done({ ...nation, lines: nation.lines.filter((l) => l.id !== cmd.lineId) });
    }
    case 'moveLine': {
      const from = nation.lines.findIndex((l) => l.id === cmd.lineId);
      if (from < 0) return fail('That production line does not exist.');
      return done({ ...nation, lines: move(nation.lines, from, cmd.to) });
    }
    case 'setLineDockyards': {
      const line = nation.lines.find((l) => l.id === cmd.lineId);
      if (!line) return fail('That production line does not exist.');
      const dockyards = Math.max(0, Math.min(lineCap(ctx, line.design), Math.floor(cmd.dockyards)));
      // New dockyards start at base efficiency, which dilutes the line's average.
      let efficiency = line.efficiency;
      if (dockyards > line.dockyards && line.dockyards > 0) {
        const added = dockyards - line.dockyards;
        efficiency = (line.dockyards * line.efficiency + added * cfg.production.efficiency.base) / dockyards;
      }
      return done({ ...nation, lines: nation.lines.map((l) => (l === line ? { ...l, dockyards, efficiency } : l)) });
    }
    case 'setLineDesign': {
      const line = nation.lines.find((l) => l.id === cmd.lineId);
      if (!line) return fail('That production line does not exist.');
      const problem = designProblem(ctx, cmd.design, state.date.year);
      if (problem) return fail(`${cmd.design.name} cannot be built: ${problem}`);
      const eff = cfg.production.efficiency;
      const oldHull = ctx.catalog.hulls.get(line.design.hullId);
      const newHull = ctx.catalog.hulls.get(cmd.design.hullId);
      const sameHull = line.design.hullId === cmd.design.hullId;
      const sameClass = oldHull?.hullClass === newHull?.hullClass;
      const retained = sameHull ? eff.retainSameHull : sameClass ? eff.retainSameClass : 0;
      const next = {
        ...line,
        design: structuredClone(cmd.design),
        efficiency: Math.max(eff.base, line.efficiency * retained),
        // Work on the slip carries over only to a variant of the same hull.
        progress: sameHull ? line.progress : 0,
        dockyards: Math.min(line.dockyards, lineCap(ctx, cmd.design)),
      };
      return done({ ...nation, lines: nation.lines.map((l) => (l === line ? next : l)) });
    }
    case 'setTrade': {
      const factories = Math.max(0, Math.floor(cmd.factories));
      return done({ ...nation, trade: { ...nation.trade, [cmd.resource]: factories } });
    }
    case 'setAutoBuild':
      return done({ ...nation, autoBuild: cmd.building });
    case 'setRepair': {
      const pick =
        cmd.ships === 'all' ? () => true
        : cmd.ships === 'damaged' ? (s: { hp?: number }) => s.hp !== undefined
        : ((ids) => (s: { id: string }) => ids.has(s.id))(new Set(cmd.ships));
      const fleet = nation.fleet.map((ship) => {
        if (!pick(ship)) return ship;
        // Only damaged ships can go into dock; recalling works for any ship.
        if (cmd.repairing && ship.hp === undefined) return ship;
        if (cmd.repairing) return { ...ship, repairing: true };
        const { repairing: _drop, ...rest } = ship;
        return rest;
      });
      return done({ ...nation, fleet });
    }
    case 'setAggressiveness': {
      if (!(cmd.aggressiveness in AGGRESSIVENESS)) return fail('Unknown aggressiveness.');
      return done({ ...nation, aggressiveness: cmd.aggressiveness });
    }
  }
}

/** Apply several commands in order, skipping any that are refused. */
export function applyCommands(ctx: EconomyContext, state: GameState, nationId: string, cmds: readonly Command[]): GameState {
  let s = state;
  for (const cmd of cmds) s = applyCommand(ctx, s, nationId, cmd).state;
  return s;
}

/**
 * Commands that top the construction queue up with `wanted`, so no factory sits
 * idle: one project per 10 building factories, plus one in hand. When slots run
 * out it queues infrastructure instead.
 */
export function queueFillCommands(ctx: EconomyContext, nation: NationState, wanted: BuildingType): Command[] {
  const report = industryReport(ctx, nation);
  const target = Math.max(1, Math.ceil(report.constructionFactories / ctx.config.construction.maxFactoriesPerProject) + 1);
  const cmds: Command[] = [];
  let free = freeSlots(nation);
  for (let n = nation.construction.length; n < target; n++) {
    if (wanted !== 'infrastructure' && free > 0) {
      cmds.push({ type: 'queueBuilding', building: wanted });
      free -= 1;
    } else {
      cmds.push({ type: 'queueBuilding', building: 'infrastructure' });
    }
  }
  return cmds;
}

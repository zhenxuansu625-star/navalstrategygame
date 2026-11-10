/**
 * A simple, deterministic nation AI: an industrial strategy (civilian factories
 * first, then dockyards from a chosen month) and production lines that follow a
 * fleet mix using the newest designs available. Balance experiments drive the
 * same code with different transition months.
 */
import { designCost } from '../designer/stats';
import type { Design, HullClass } from '../designer/types';
import { designProblem } from './commands';
import { nationDef, resolveModifiers, type EconomyContext } from './context';
import { freeSlots, industryReport, lineCap } from './industry';
import { newestDesign } from './step';
import type { AiProfile, BuildingType, Command, GameState, NationState, ResourceType } from './types';

interface WantedLine {
  design: Design;
  dockyards: number;
}

/** Split the nation's dockyards between hull classes by the fleet mix, then into lines no bigger than the cap. */
export function wantedLines(ctx: EconomyContext, nation: NationState, profile: AiProfile, year: number): WantedLine[] {
  const classes: { design: Design; weight: number }[] = [];
  for (const [hullClass, weight] of Object.entries(profile.fleetMix) as [HullClass, number][]) {
    if (weight <= 0) continue;
    const design = newestDesign(ctx, hullClass, year);
    if (design) classes.push({ design, weight });
  }
  if (classes.length === 0 || nation.dockyards <= 0) return [];

  // Largest-remainder split so every dockyard is used.
  const split = (): number[] => {
    const totalWeight = classes.reduce((n, c) => n + c.weight, 0);
    const shares = classes.map((c) => (nation.dockyards * c.weight) / totalWeight);
    const whole = shares.map(Math.floor);
    let spare = nation.dockyards - whole.reduce((a, b) => a + b, 0);
    const byRemainder = shares.map((s, i) => ({ i, r: s - Math.floor(s) })).sort((a, b) => b.r - a.r || a.i - b.i);
    for (const { i } of byRemainder) {
      if (spare <= 0) break;
      whole[i]! += 1;
      spare -= 1;
    }
    return whole;
  };

  // A small navy concentrates: big ships with too few dockyards would take a decade,
  // so drop the least-favoured big-ship class until the rest get enough.
  const isBig = (d: Design) => ctx.catalog.hulls.get(d.hullId)?.line !== 'screen';
  let whole = split();
  for (;;) {
    let drop = -1;
    whole.forEach((n, i) => {
      if (!isBig(classes[i]!.design) || n >= ctx.config.ai.minDockyardsBigShip) return;
      if (drop < 0 || classes[i]!.weight <= classes[drop]!.weight) drop = i;
    });
    if (drop < 0 || classes.length <= 1) break;
    classes.splice(drop, 1);
    whole = split();
  }

  const out: WantedLine[] = [];
  classes.forEach((c, i) => {
    let left = whole[i]!;
    const cap = lineCap(ctx, c.design);
    while (left > 0 && cap > 0) {
      const n = Math.min(cap, left);
      out.push({ design: c.design, dockyards: n });
      left -= n;
    }
  });
  return out;
}

function productionCommands(ctx: EconomyContext, state: GameState, nation: NationState, profile: AiProfile): Command[] {
  const cmds: Command[] = [];
  const wanted = wantedLines(ctx, nation, profile, state.date.year);
  const classOf = (d: Design) => ctx.catalog.hulls.get(d.hullId)?.hullClass;
  const pool = [...nation.lines];
  for (const w of wanted) {
    const idx = pool.findIndex((l) => classOf(l.design) === classOf(w.design));
    if (idx < 0) {
      cmds.push({ type: 'addLine', design: w.design, dockyards: w.dockyards });
      continue;
    }
    const [line] = pool.splice(idx, 1);
    if (line!.design.id !== w.design.id) {
      const cost = designCost(ctx.catalog, line!.design).production;
      const early = line!.progress < cost * ctx.config.ai.retoolBelowProgress;
      if (early && !designProblem(ctx, w.design, state.date.year)) {
        cmds.push({ type: 'setLineDesign', lineId: line!.id, design: w.design });
      }
    }
    if (line!.dockyards !== w.dockyards) cmds.push({ type: 'setLineDockyards', lineId: line!.id, dockyards: w.dockyards });
  }
  // Lines the mix no longer calls for give up their dockyards.
  for (const line of pool) if (line.dockyards !== 0) cmds.push({ type: 'setLineDockyards', lineId: line.id, dockyards: 0 });
  return cmds;
}

function constructionCommands(ctx: EconomyContext, state: GameState, nation: NationState, profile: AiProfile): Command[] {
  const cfg = ctx.config;
  const report = industryReport(ctx, nation);
  const wanted: BuildingType = state.turn < profile.transitionMonth ? 'civilianFactory' : 'dockyard';
  const target = Math.max(1, Math.ceil(report.constructionFactories / cfg.construction.maxFactoriesPerProject) + 1);
  const cmds: Command[] = [];
  let free = freeSlots(nation);
  for (let n = nation.construction.length; n < target; n++) {
    if (free > 0) {
      cmds.push({ type: 'queueBuilding', building: wanted });
      free -= 1;
    } else {
      cmds.push({ type: 'queueBuilding', building: 'infrastructure' });
    }
  }
  return cmds;
}

function tradeCommands(ctx: EconomyContext, nation: NationState): Command[] {
  const cfg = ctx.config;
  const report = industryReport(ctx, nation);
  const mods = resolveModifiers(nationDef(ctx, nation.id));
  const usable = nation.civilianFactories - report.consumerGoods;
  let budget = Math.floor(usable * cfg.ai.maxTradeShare);
  const cmds: Command[] = [];
  for (const r of ['steel', 'chromium'] as ResourceType[]) {
    const shortfall = Math.max(0, report.demand[r] - nation.resources[r]);
    const perFactory = cfg.trade.perFactory[r] * (1 + mods.tradeYield);
    const factories = Math.min(budget, Math.ceil(shortfall / perFactory));
    budget -= factories;
    if (factories !== nation.trade[r]) cmds.push({ type: 'setTrade', resource: r, factories });
  }
  return cmds;
}

/** This month's commands for an AI nation. */
export function aiCommands(ctx: EconomyContext, state: GameState, nationId: string, profile?: AiProfile): Command[] {
  const nation = state.nations[nationId];
  if (!nation) return [];
  const p = profile ?? nationDef(ctx, nationId).ai;
  return [
    ...productionCommands(ctx, state, nation, p),
    ...tradeCommands(ctx, nation),
    ...constructionCommands(ctx, state, nation, p),
  ];
}

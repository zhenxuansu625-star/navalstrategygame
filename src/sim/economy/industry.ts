/**
 * How a nation's factories and dockyards are employed in the current month.
 * The monthly step and the UI both read this, so what the player sees is
 * exactly what the turn will do.
 */
import { designCost } from '../designer/stats';
import type { Design } from '../designer/types';
import { nationDef, resolveModifiers, type EconomyContext } from './context';
import { RESOURCES, type IndustryReport, type LineReport, type NationState, type ResourceType } from './types';

export function slotsUsed(nation: NationState): number {
  const queued = nation.construction.filter((c) => c.building !== 'infrastructure').length;
  return nation.civilianFactories + nation.dockyards + queued;
}

export function freeSlots(nation: NationState): number {
  return nation.buildingSlots - slotsUsed(nation);
}

/** Cost of the next infrastructure level, counting levels already queued. */
export function infrastructureCost(ctx: EconomyContext, nation: NationState): number {
  const c = ctx.config.construction;
  const queued = nation.construction.filter((i) => i.building === 'infrastructure').length;
  return Math.round(c.cost.infrastructure * (1 + c.infrastructureCostGrowth * (nation.infrastructure + queued)));
}

export function lineCap(ctx: EconomyContext, design: Design): number {
  const hull = ctx.catalog.hulls.get(design.hullId);
  return hull ? ctx.config.production.maxDockyardsPerLine[hull.line] : 0;
}

export function industryReport(ctx: EconomyContext, nation: NationState): IndustryReport {
  const cfg = ctx.config;
  const mods = resolveModifiers(nationDef(ctx, nation.id));

  // Civilian factories: consumer goods first, then trade, the rest build.
  const share = Math.min(0.95, Math.max(0, cfg.consumerGoodsShare + mods.consumerGoods));
  const consumerGoods = Math.round(nation.civilianFactories * share);
  const usable = nation.civilianFactories - consumerGoods;
  const tradeSteel = Math.min(usable, nation.trade.steel);
  const tradeChromium = Math.min(usable - tradeSteel, nation.trade.chromium);
  const tradeFactories = tradeSteel + tradeChromium;
  const constructionFactories = usable - tradeFactories;

  let left = constructionFactories;
  const factoriesPerItem = nation.construction.map(() => {
    const n = Math.min(cfg.construction.maxFactoriesPerProject, left);
    left -= n;
    return n;
  });

  const yieldMult = 1 + mods.tradeYield;
  const supply: Record<ResourceType, number> = {
    steel: nation.resources.steel + Math.floor(tradeSteel * cfg.trade.perFactory.steel * yieldMult),
    chromium: nation.resources.chromium + Math.floor(tradeChromium * cfg.trade.perFactory.chromium * yieldMult),
  };

  // Dockyards and resources go to lines in priority order.
  const demand: Record<ResourceType, number> = { steel: 0, chromium: 0 };
  const remaining: Record<ResourceType, number> = { ...supply };
  let dockyardsLeft = nation.dockyards;
  const lines: LineReport[] = nation.lines.map((line) => {
    const cap = lineCap(ctx, line.design);
    const assigned = Math.max(0, Math.min(line.dockyards, cap, dockyardsLeft));
    dockyardsLeft -= assigned;
    const cost = designCost(ctx.catalog, line.design);
    let worst = 1;
    if (assigned > 0) {
      for (const r of RESOURCES) {
        const need = cost[r];
        demand[r] += need;
        if (need <= 0) continue;
        const got = Math.min(need, remaining[r]);
        remaining[r] -= got;
        worst = Math.min(worst, got / need);
      }
    }
    const resourceFactor = 1 - cfg.production.resourceShortfallPenalty * (1 - worst);
    const hullClass = ctx.catalog.hulls.get(line.design.hullId)?.hullClass ?? '';
    const bonus = 1 + (mods.dockyardOutput.all ?? 0) + (mods.dockyardOutput[hullClass] ?? 0);
    const output = assigned * ctx.dockyardOutputPerMonth * cfg.pace * line.efficiency * resourceFactor * Math.max(0, bonus);
    const monthsToNext = output > 0 ? Math.max(1, Math.ceil((cost.production - line.progress) / output)) : null;
    return { lineId: line.id, assigned, cap, resourceFactor, output, cost: cost.production, monthsToNext };
  });

  return {
    consumerGoods,
    tradeFactories,
    constructionFactories,
    factoriesPerItem,
    idleFactories: left,
    supply,
    demand,
    lines,
    idleDockyards: dockyardsLeft,
    slotsUsed: slotsUsed(nation),
  };
}

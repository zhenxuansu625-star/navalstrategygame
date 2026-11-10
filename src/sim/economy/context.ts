import { PRESET_DESIGNS } from '../../data/designs';
import { ECONOMY, type EconomyConfig } from '../../data/economy';
import { NATIONS } from '../../data/nations';
import { PRODUCTION } from '../../data/production';
import { DEFAULT_CATALOG, type Catalog } from '../designer/catalog';
import type { Design } from '../designer/types';
import type { BuildingType, Modifiers, NationDef, ScalableStat } from './types';

/** Everything the economy rules read besides the game state. Tests and experiments swap parts of it. */
export interface EconomyContext {
  catalog: Catalog;
  config: EconomyConfig;
  nations: ReadonlyMap<string, NationDef>;
  /** Designs the AI and starting fleets may use. */
  presets: readonly Design[];
  /** Production points one dockyard adds per month at full efficiency. */
  dockyardOutputPerMonth: number;
}

export function makeContext(overrides: Partial<EconomyContext> = {}): EconomyContext {
  return {
    catalog: DEFAULT_CATALOG,
    config: ECONOMY,
    nations: new Map(NATIONS.map((n) => [n.id, n])),
    presets: PRESET_DESIGNS,
    dockyardOutputPerMonth: PRODUCTION.dockyardOutputPerDay * PRODUCTION.daysPerMonth,
    ...overrides,
  };
}

export const DEFAULT_CONTEXT: EconomyContext = makeContext();

export function nationDef(ctx: EconomyContext, id: string): NationDef {
  const def = ctx.nations.get(id);
  if (!def) throw new Error(`Unknown nation ${id}`);
  return def;
}

/** A nation's trait bonuses added together. Inactive traits are ignored. */
export interface ResolvedModifiers {
  constructionSpeed: Record<BuildingType, number>;
  consumerGoods: number;
  dockyardOutput: Record<string, number>;
  lineEfficiencyGain: number;
  tradeYield: number;
  shipStats: Partial<Record<ScalableStat, number>>;
}

export function resolveModifiers(def: NationDef): ResolvedModifiers {
  const out: ResolvedModifiers = {
    constructionSpeed: { civilianFactory: 0, dockyard: 0, infrastructure: 0 },
    consumerGoods: 0,
    dockyardOutput: {},
    lineEfficiencyGain: 0,
    tradeYield: 0,
    shipStats: {},
  };
  const add = (m: Modifiers) => {
    for (const [k, v] of Object.entries(m.constructionSpeed ?? {})) out.constructionSpeed[k as BuildingType] += v;
    out.consumerGoods += m.consumerGoods ?? 0;
    for (const [k, v] of Object.entries(m.dockyardOutput ?? {})) out.dockyardOutput[k] = (out.dockyardOutput[k] ?? 0) + v;
    out.lineEfficiencyGain += m.lineEfficiencyGain ?? 0;
    out.tradeYield += m.tradeYield ?? 0;
    for (const [k, v] of Object.entries(m.shipStats ?? {})) {
      out.shipStats[k as ScalableStat] = (out.shipStats[k as ScalableStat] ?? 0) + v;
    }
  };
  for (const trait of def.traits) if (!trait.inactive) add(trait.modifiers);
  return out;
}

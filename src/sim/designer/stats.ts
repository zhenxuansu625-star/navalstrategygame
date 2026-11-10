import { DESIGN_RULES } from '../../data/designRules';
import { PRODUCTION } from '../../data/production';
import type { Catalog } from './catalog';
import type { Cost, Design, DesignStats, Module, ModuleStats } from './types';

function fittedModules(catalog: Catalog, design: Design): Module[] {
  const hull = catalog.hulls.get(design.hullId);
  if (!hull) return [];
  const out: Module[] = [];
  for (const slot of hull.slots) {
    const id = design.slots[slot.id];
    const m = id ? catalog.modules.get(id) : undefined;
    if (m) out.push(m);
  }
  return out;
}

const PIERCING_KEYS = ['lightPiercing', 'heavyPiercing', 'torpedoPiercing'] as const;
const ADDITIVE_KEYS = [
  'hp', 'armour', 'lightAttack', 'heavyAttack', 'torpedoAttack', 'fireControl',
  'speed', 'visibility', 'aa', 'surfaceDetection', 'subDetection',
] as const satisfies readonly (keyof ModuleStats)[];

/**
 * Final stats of a design: hull base values plus every fitted module.
 * Attacks, armour, HP, speed and visibility add up; piercing is the best
 * piercing among the modules providing that attack (the guns that matter).
 */
export function deriveStats(catalog: Catalog, design: Design): DesignStats {
  const hull = catalog.hulls.get(design.hullId);
  if (!hull) throw new Error(`Unknown hull ${design.hullId}`);
  const s: DesignStats = {
    line: hull.line,
    hp: hull.hp,
    org: hull.org,
    armour: hull.armour,
    lightAttack: 0,
    lightPiercing: 0,
    heavyAttack: 0,
    heavyPiercing: 0,
    torpedoAttack: 0,
    torpedoPiercing: 0,
    fireControl: 0,
    speed: hull.speed,
    visibility: hull.visibility,
    aa: 0,
    surfaceDetection: 0,
    subDetection: 0,
  };
  for (const m of fittedModules(catalog, design)) {
    for (const key of ADDITIVE_KEYS) s[key] += m.stats[key] ?? 0;
    for (const key of PIERCING_KEYS) s[key] = Math.max(s[key], m.stats[key] ?? 0);
  }
  s.speed = Math.max(DESIGN_RULES.minSpeed, s.speed);
  s.fireControl = Math.round(s.fireControl * 1000) / 1000;
  return s;
}

export interface DesignCost extends Cost {
  /** Production divided by one dockyard's daily output. */
  dockyardDays: number;
  /** Days to build with the reference number of dockyards. */
  daysAtReference: number;
}

export function designCost(catalog: Catalog, design: Design): DesignCost {
  const hull = catalog.hulls.get(design.hullId);
  if (!hull) throw new Error(`Unknown hull ${design.hullId}`);
  const c: Cost = { ...hull.cost };
  for (const m of fittedModules(catalog, design)) {
    c.production += m.cost.production;
    c.steel += m.cost.steel;
    c.chromium += m.cost.chromium;
  }
  const dockyardDays = c.production / PRODUCTION.dockyardOutputPerDay;
  return { ...c, dockyardDays, daysAtReference: Math.ceil(dockyardDays / PRODUCTION.referenceDockyards) };
}

/** Year of the newest hull or module in the design. */
export function designYear(catalog: Catalog, design: Design): number {
  const hull = catalog.hulls.get(design.hullId);
  let year = hull?.year ?? 0;
  for (const m of fittedModules(catalog, design)) year = Math.max(year, m.year);
  return year;
}

export type NumericStatKey = Exclude<keyof DesignStats, 'line'>;

/** b - a for every numeric stat. */
export function compareStats(a: DesignStats, b: DesignStats): Record<NumericStatKey, number> {
  const out = {} as Record<NumericStatKey, number>;
  for (const key of Object.keys(a) as (keyof DesignStats)[]) {
    if (key === 'line') continue;
    out[key] = Math.round(((b[key] as number) - (a[key] as number)) * 1000) / 1000;
  }
  return out;
}

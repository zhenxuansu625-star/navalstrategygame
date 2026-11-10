/** Turn fleets of designs into a battle setup. */
import type { AggressivenessId } from '../../data/battle';
import type { BattleSetup, ShipSetup, SideSetup } from '../battle/types';
import type { Catalog } from './catalog';
import { deriveStats } from './stats';
import type { Design } from './types';
import { validateDesign } from './validate';

export interface FleetEntry {
  designId: string;
  count: number;
}

export interface FleetSetup {
  name: string;
  aggressiveness: AggressivenessId;
  ships: FleetEntry[];
}

export interface BuildResult {
  setup: BattleSetup;
  /** Entries that were skipped (unknown or invalid designs). */
  problems: string[];
}

function buildSide(
  catalog: Catalog,
  designs: ReadonlyMap<string, Design>,
  fleet: FleetSetup,
  names: readonly string[],
  problems: string[],
): SideSetup {
  const ships: ShipSetup[] = [];
  const perDesign = new Map<string, number>();
  for (const entry of fleet.ships) {
    const design = designs.get(entry.designId);
    if (!design) {
      problems.push(`${fleet.name}: unknown design "${entry.designId}" skipped.`);
      continue;
    }
    const issues = validateDesign(catalog, design);
    if (issues.length > 0) {
      problems.push(`${fleet.name}: "${design.name}" is not a valid design (${issues[0]!.message}) and was skipped.`);
      continue;
    }
    const stats = deriveStats(catalog, design);
    const hullClass = catalog.hulls.get(design.hullId)!.hullClass;
    for (let i = 0; i < Math.max(0, Math.floor(entry.count)); i++) {
      const n = (perDesign.get(design.id) ?? 0) + 1;
      perDesign.set(design.id, n);
      const name = names[ships.length] ?? `${design.name} ${n}`;
      ships.push({ name, className: design.name, hullClass, stats: { ...stats } });
    }
  }
  return { name: fleet.name, aggressiveness: fleet.aggressiveness, ships };
}

export function buildBattleSetup(
  catalog: Catalog,
  designs: readonly Design[],
  fleets: readonly [FleetSetup, FleetSetup],
  names: readonly [readonly string[], readonly string[]] = [[], []],
): BuildResult {
  const byId = new Map(designs.map((d) => [d.id, d]));
  const problems: string[] = [];
  const setup: BattleSetup = {
    sides: [
      buildSide(catalog, byId, fleets[0], names[0], problems),
      buildSide(catalog, byId, fleets[1], names[1], problems),
    ],
  };
  return { setup, problems };
}

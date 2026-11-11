/** Turning campaign fleets into battles. */
import type { BattleSetup, ShipStats, SideSetup } from '../battle/types';
import { deriveStats } from '../designer/stats';
import type { Design } from '../designer/types';
import { nationDef, resolveModifiers, type EconomyContext } from './context';
import type { GameState, NationDef, ScalableStat } from './types';

/** A design's battle stats as built by this nation, including its ship-stat traits. */
export function nationShipStats(ctx: EconomyContext, def: NationDef, design: Design): ShipStats {
  const stats: ShipStats = { ...deriveStats(ctx.catalog, design) };
  const mods = resolveModifiers(def).shipStats;
  for (const [key, bonus] of Object.entries(mods) as [ScalableStat, number][]) {
    stats[key] = Math.round(stats[key] * (1 + bonus) * 10) / 10;
  }
  return stats;
}

export function fleetSide(ctx: EconomyContext, state: GameState, nationId: string): SideSetup {
  const nation = state.nations[nationId]!;
  const def = nationDef(ctx, nationId);
  const cache = new Map<string, ShipStats>();
  return {
    name: `${nation.adjective ?? def.adjective} Navy`,
    aggressiveness: nation.aggressiveness,
    // Ships in dock for repair stay in port.
    ships: nation.fleet.filter((ship) => !ship.repairing).map((ship) => {
      const key = JSON.stringify(ship.design);
      let stats = cache.get(key);
      if (!stats) {
        stats = nationShipStats(ctx, def, ship.design);
        cache.set(key, stats);
      }
      const hullClass = ctx.catalog.hulls.get(ship.design.hullId)?.hullClass;
      return {
        name: ship.name,
        className: ship.design.name,
        refId: ship.id,
        ...(hullClass ? { hullClass } : {}),
        ...(ship.hp !== undefined ? { hp: ship.hp } : {}),
        ...(ship.org !== undefined ? { org: ship.org } : {}),
        stats: { ...stats },
      };
    }),
  };
}

/** A battle between two nations' whole fleets. */
export function fleetBattleSetup(ctx: EconomyContext, state: GameState, aId: string, bId: string): BattleSetup {
  return { sides: [fleetSide(ctx, state, aId), fleetSide(ctx, state, bId)] };
}

/** Groups ships of the same class on one side and line, for the condensed battle view. */
import type { BattleState, Line, ShipState, SideIndex } from '../sim/battle';

export interface ShipGroup {
  key: string;
  side: SideIndex;
  line: Line;
  className: string;
  hullClass?: string;
  ships: ShipState[];
  active: number;
  retreating: number;
  sunk: number;
  escaped: number;
  /** Strike aircraft left on this class's active carriers. */
  planes: number;
  /** Submarines still submerged (cannot be targeted). */
  hidden: number;
  /** HP and org of ships still in the battle, as a fraction of their maximum (0 if none remain). */
  hpFrac: number;
  orgFrac: number;
}

/** Bigger ships first, matching how a battle line is usually read. */
const HULL_ORDER = ['carrier', 'superHeavy', 'battleship', 'battlecruiser', 'heavyCruiser', 'lightCruiser', 'destroyer'];

export function groupShips(battle: Pick<BattleState, 'ships'>, side: SideIndex, line: Line): ShipGroup[] {
  const groups = new Map<string, ShipGroup>();
  for (const ship of battle.ships) {
    if (ship.side !== side || ship.stats.line !== line) continue;
    const key = `${side}|${ship.className}|${ship.hullClass ?? ''}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key, side, line, className: ship.className,
        ...(ship.hullClass ? { hullClass: ship.hullClass } : {}),
        ships: [], active: 0, retreating: 0, sunk: 0, escaped: 0, planes: 0, hidden: 0, hpFrac: 0, orgFrac: 0,
      };
      groups.set(key, g);
    }
    g.ships.push(ship);
    g[ship.status === 'active' ? 'active' : ship.status] += 1;
    if (ship.status === 'active') g.planes += ship.planes;
    if (ship.hidden && (ship.status === 'active' || ship.status === 'retreating')) g.hidden += 1;
  }
  for (const g of groups.values()) {
    let hp = 0, maxHp = 0, org = 0, maxOrg = 0;
    for (const s of g.ships) {
      if (s.status !== 'active' && s.status !== 'retreating') continue;
      hp += s.hp;
      maxHp += s.stats.hp;
      org += s.org;
      maxOrg += s.stats.org;
    }
    g.hpFrac = maxHp > 0 ? hp / maxHp : 0;
    g.orgFrac = maxOrg > 0 ? org / maxOrg : 0;
  }
  const rank = (g: ShipGroup) => {
    const i = HULL_ORDER.indexOf(g.hullClass ?? '');
    return i < 0 ? HULL_ORDER.length : i;
  };
  return [...groups.values()].sort((a, b) => rank(a) - rank(b) || a.className.localeCompare(b.className));
}

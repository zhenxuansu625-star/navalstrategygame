import { describe, expect, it } from 'vitest';
import { createBattle, type BattleSetup, type ShipStats } from '../src/sim/battle';
import { groupShips } from '../src/ui/battleGroups';
import { stats } from './helpers';

const ship = (name: string, className: string, hullClass: string, s: Partial<ShipStats> = {}) => ({
  name, className, hullClass, stats: stats(s),
});

describe('condensed battle groups', () => {
  const setup: BattleSetup = {
    sides: [
      {
        name: 'A', aggressiveness: 'mediumRisk',
        ships: [
          ship('d1', 'Destroyer 1915', 'destroyer', { line: 'screen', hp: 40 }),
          ship('b1', 'Battleship 1915', 'battleship', { hp: 200 }),
          ship('d2', 'Destroyer 1915', 'destroyer', { line: 'screen', hp: 40 }),
          ship('b2', 'Battleship 1915', 'battleship', { hp: 200 }),
          ship('c1', 'Battlecruiser 1916', 'battlecruiser', { hp: 150 }),
        ],
      },
      { name: 'B', aggressiveness: 'mediumRisk', ships: [ship('x', 'Destroyer 1915', 'destroyer', { line: 'screen' })] },
    ],
  };

  it('groups by class within a side and line, biggest hulls first', () => {
    const battle = createBattle(setup);
    const capitals = groupShips(battle, 0, 'capital');
    expect(capitals.map((g) => [g.className, g.ships.length])).toEqual([
      ['Battleship 1915', 2],
      ['Battlecruiser 1916', 1],
    ]);
    expect(groupShips(battle, 0, 'screen').map((g) => g.ships.length)).toEqual([2]);
    expect(groupShips(battle, 1, 'screen').map((g) => g.ships.length)).toEqual([1]);
  });

  it('counts statuses and averages HP over ships still in the battle', () => {
    const battle = createBattle(setup);
    const [b1, b2] = battle.ships.filter((s) => s.className === 'Battleship 1915');
    b1!.hp = 50;
    b1!.status = 'retreating';
    b2!.hp = 0;
    b2!.status = 'sunk';
    const [bb] = groupShips(battle, 0, 'capital');
    expect(bb).toMatchObject({ active: 0, retreating: 1, sunk: 1, escaped: 0 });
    expect(bb!.hpFrac).toBeCloseTo(0.25); // only the retreating ship counts: 50/200
  });

  it('a group with no ships left has empty bars', () => {
    const battle = createBattle(setup);
    for (const s of battle.ships) if (s.className === 'Battlecruiser 1916') s.status = 'escaped';
    const bc = groupShips(battle, 0, 'capital').find((g) => g.className === 'Battlecruiser 1916')!;
    expect(bc.escaped).toBe(1);
    expect(bc.hpFrac).toBe(0);
  });
});

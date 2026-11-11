import { describe, expect, it } from 'vitest';
import { BOOKMARKS } from '../src/data/bookmarks';
import { eraOf } from '../src/data/eras';
import { STARTING_FLEETS } from '../src/data/startingFleets';
import { createBattle, runBattle } from '../src/sim/battle';
import { designYear, type HullClass } from '../src/sim/designer';
import { createGame, DEFAULT_CONTEXT as ctx, fleetBattleSetup, startingDesign } from '../src/sim/economy';
import { createRng } from '../src/sim/rng';

const classOf = (hullId: string) => ctx.catalog.hulls.get(hullId)!.hullClass;
const count = (nationId: string, bookmarkId: string, year: number) => {
  const s = createGame(ctx, { playerId: nationId, rivalId: nationId === 'uk' ? 'germany' : 'uk', startYear: year, fleets: STARTING_FLEETS[bookmarkId] });
  const by: Partial<Record<HullClass, number>> = {};
  for (const ship of s.nations[nationId]!.fleet) by[classOf(ship.design.hullId)] = (by[classOf(ship.design.hullId)] ?? 0) + 1;
  return { by, fleet: s.nations[nationId]!.fleet };
};

describe('historical starting fleets', () => {
  it('every nation at every start date has one', () => {
    for (const b of BOOKMARKS) {
      for (const n of b.nations) expect(STARTING_FLEETS[b.id]?.[n.nationId], `${b.id} ${n.nationId}`).toBeDefined();
    }
  });

  it('every ship uses a design that existed at the start date', () => {
    for (const b of BOOKMARKS) {
      for (const n of b.nations) {
        const { fleet } = count(n.nationId, b.id, b.year);
        for (const ship of fleet) expect(designYear(ctx.catalog, ship.design), `${b.id} ${n.nationId} ${ship.design.name}`).toBeLessThanOrEqual(b.year);
      }
    }
  });

  it('builds the fleet the data asks for, class by class', () => {
    for (const b of BOOKMARKS) {
      for (const n of b.nations) {
        const spec = STARTING_FLEETS[b.id]![n.nationId]!;
        const { by } = count(n.nationId, b.id, b.year);
        for (const [hullClass, eras] of Object.entries(spec) as [HullClass, Record<string, number>][]) {
          const wanted = Object.values(eras).reduce((a, x) => a + x, 0);
          // Only classes with no design at all in that year (e.g. submarines in 1890) can come up short.
          const possible = Object.keys(eras).some((era) => startingDesign(ctx, hullClass, era as never, b.year));
          expect(by[hullClass] ?? 0, `${b.id} ${n.nationId} ${hullClass}`).toBe(possible ? wanted : 0);
        }
      }
    }
  });

  it('the US in 1936: 15 WW1-era battleships, 3 carriers, 16 heavy and 10 light cruisers', () => {
    const { by, fleet } = count('usa', 'road_to_war_1936', 1936);
    expect(by).toMatchObject({ battleship: 15, carrier: 3, heavyCruiser: 16, lightCruiser: 10 });
    expect(by.destroyer).toBeGreaterThanOrEqual(100);
    expect(by.submarine).toBeGreaterThanOrEqual(50);
    const battleships = fleet.filter((s) => classOf(s.design.hullId) === 'battleship');
    expect(new Set(battleships.map((s) => s.design.name))).toEqual(new Set(['Early Battleship']));
  });

  it('ships take their era tier, falling back to older designs when that tier is not yet built', () => {
    expect(startingDesign(ctx, 'lightCruiser', 'early', 1914)?.name).toBe('Early Light Cruiser');
    expect(startingDesign(ctx, 'battleship', 'basic', 1936)?.name).toBe('Basic Battleship');
    // The Improved Carrier dates from 1940: a 1939 "improved" carrier falls back to the Basic Carrier.
    expect(startingDesign(ctx, 'carrier', 'improved', 1939)?.name).toBe('Basic Carrier');
    // An "early" request never picks a newer era's design.
    expect(eraOf(designYear(ctx.catalog, startingDesign(ctx, 'destroyer', 'early', 1939)!)).id).toBe('early');
    // No carrier existed in 1914.
    expect(startingDesign(ctx, 'carrier', 'basic', 1914)).toBeUndefined();
  });

  it('a full-size 1914 war game (UK vs Germany) still resolves quickly', () => {
    const s = createGame(ctx, { playerId: 'uk', rivalId: 'germany', startYear: 1914, fleets: STARTING_FLEETS.guns_of_august_1914 });
    const setup = fleetBattleSetup(ctx, s, 'uk', 'germany');
    expect(setup.sides[0].ships.length).toBeGreaterThan(400);
    const t0 = Date.now();
    const end = runBattle(createBattle(setup), createRng(1));
    expect(end.result).toBeDefined();
    expect(Date.now() - t0).toBeLessThan(5000);
  });
});

import { describe, expect, it } from 'vitest';
import { ECONOMY } from '../src/data/economy';
import { createBattle, runBattle } from '../src/sim/battle';
import {
  aiCommands,
  applyBattleResult,
  applyCommand,
  createGame,
  daysInMonth,
  DEFAULT_CONTEXT as ctx,
  fleetBattleSetup,
  fleetSide,
  migrateGame,
  nationName,
  nextDay,
  repairBerths,
  shipMax,
  shipsInDock,
  step,
  stepDay,
  type GameState,
} from '../src/sim/economy';
import { createRng } from '../src/sim/rng';

const rng = createRng(1);
const newGame = () => createGame(ctx, { playerId: 'uk', rivalId: 'germany', startYear: 1914 });
const ok = (s: GameState, nationId: string, cmd: Parameters<typeof applyCommand>[3]) => {
  const r = applyCommand(ctx, s, nationId, cmd);
  expect(r.error).toBeUndefined();
  return r.state;
};
/** Damage the first n British ships to a share of their HP. */
function damage(s: GameState, n: number, share: number): GameState {
  const next = structuredClone(s);
  for (const ship of next.nations.uk!.fleet.slice(0, n)) ship.hp = shipMax(ctx, 'uk', ship).hp * share;
  return next;
}

describe('calendar', () => {
  it('knows month lengths, including leap years', () => {
    expect(daysInMonth(1914, 1)).toBe(31);
    expect(daysInMonth(1914, 2)).toBe(28);
    expect(daysInMonth(1916, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(nextDay({ year: 1914, month: 12, day: 31 })).toEqual({ year: 1915, month: 1, day: 1 });
    expect(nextDay({ year: 1914, month: 3, day: 9 })).toEqual({ year: 1914, month: 3, day: 10 });
  });

  it('a month of days equals one monthly step', () => {
    const s0 = ok(newGame(), 'uk', { type: 'queueBuilding', building: 'dockyard' });
    let daily = s0;
    for (let i = 0; i < 31; i++) daily = stepDay(daily, {}, rng, ctx);
    const monthly = step(s0, {}, rng, ctx);
    expect(daily.date).toEqual(monthly.date);
    expect(daily.turn).toBe(1);
    expect(daily.nations.uk!.construction[0]!.progress).toBeCloseTo(monthly.nations.uk!.construction[0]!.progress);
  });

  it('progress grows a little every day', () => {
    let s = ok(newGame(), 'uk', { type: 'queueBuilding', building: 'dockyard' });
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) {
      s = stepDay(s, {}, rng, ctx);
      seen.push(s.nations.uk!.construction[0]!.progress);
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]!).toBeGreaterThan(seen[i - 1]!);
  });

  it('continues past 1945 with no end date', () => {
    let s = createGame(ctx, { playerId: 'usa', rivalId: 'japan', startYear: 1939 });
    for (let i = 0; i < 12 * 8; i++) s = step(s, { japan: aiCommands(ctx, s, 'japan') }, rng, ctx);
    expect(s.date.year).toBe(1947);
  });

  it('old saves without a day still load', () => {
    const old = { ...newGame(), date: { year: 1914, month: 3 } } as GameState;
    expect(migrateGame(old).date).toEqual({ year: 1914, month: 3, day: 1 });
    expect(stepDay(old, {}, rng, ctx).date).toEqual({ year: 1914, month: 3, day: 2 });
  });
});

describe('repairs', () => {
  it('damaged ships in dock regain HP each day until whole, then leave dock', () => {
    let s = damage(newGame(), 1, 0.5);
    const ship = s.nations.uk!.fleet[0]!;
    const max = shipMax(ctx, 'uk', ship).hp;
    s = ok(s, 'uk', { type: 'setRepair', ships: [ship.id], repairing: true });
    s = stepDay(s, {}, rng, ctx);
    const after = s.nations.uk!.fleet[0]!.hp!;
    expect(after).toBeCloseTo(max * 0.5 + (max * ECONOMY.repair.hpPerMonth) / 31);
    s = step(s, {}, rng, ctx);
    s = step(s, {}, rng, ctx);
    const healed = s.nations.uk!.fleet[0]!;
    expect(healed.hp).toBeUndefined();
    expect(healed.repairing).toBeUndefined();
    expect(s.events.some((e) => e.kind === 'repair' && e.text.includes(ship.name))).toBe(true);
  });

  it('damaged ships that are not in dock stay damaged', () => {
    let s = damage(newGame(), 1, 0.5);
    s = step(s, {}, rng, ctx);
    expect(s.nations.uk!.fleet[0]!.hp).toBeCloseTo(shipMax(ctx, 'uk', s.nations.uk!.fleet[0]!).hp * 0.5);
  });

  it('only as many ships repair at once as there are berths', () => {
    let s = damage(newGame(), 12, 0.5);
    s = ok(s, 'uk', { type: 'setRepair', ships: 'damaged', repairing: true });
    const berths = repairBerths(ctx, s.nations.uk!);
    expect(berths).toBe(Math.max(ECONOMY.repair.minBerths, Math.floor(18 / ECONOMY.repair.dockyardsPerBerth)));
    expect(shipsInDock(ctx, s.nations.uk!)).toHaveLength(berths);
    s = stepDay(s, {}, rng, ctx);
    const fleet = s.nations.uk!.fleet;
    const repaired = fleet.slice(0, 12).filter((x) => x.hp! > shipMax(ctx, 'uk', x).hp * 0.5 + 1e-9).length;
    expect(repaired).toBe(berths);
  });

  it('repair all and cancel repairs', () => {
    let s = damage(newGame(), 3, 0.6);
    s = ok(s, 'uk', { type: 'setRepair', ships: 'damaged', repairing: true });
    expect(s.nations.uk!.fleet.filter((x) => x.repairing)).toHaveLength(3);
    // Undamaged ships cannot be sent to dock.
    s = ok(s, 'uk', { type: 'setRepair', ships: 'all', repairing: true });
    expect(s.nations.uk!.fleet.filter((x) => x.repairing)).toHaveLength(3);
    s = ok(s, 'uk', { type: 'setRepair', ships: 'all', repairing: false });
    expect(s.nations.uk!.fleet.some((x) => x.repairing)).toBe(false);
  });

  it('organisation recovers on its own', () => {
    const s0 = structuredClone(newGame());
    s0.nations.uk!.fleet[0]!.org = 1;
    const s = step(s0, {}, rng, ctx);
    expect(s.nations.uk!.fleet[0]!.org).toBeUndefined();
  });
});

describe('battles in the campaign', () => {
  it('ships in dock stay in port; damaged ships fight with their damage', () => {
    let s = damage(newGame(), 2, 0.4);
    const [a, b] = s.nations.uk!.fleet;
    s = ok(s, 'uk', { type: 'setRepair', ships: [a!.id], repairing: true });
    const side = fleetSide(ctx, s, 'uk');
    expect(side.ships.some((x) => x.refId === a!.id)).toBe(false);
    const bSetup = side.ships.find((x) => x.refId === b!.id)!;
    expect(bSetup.hp).toBeCloseTo(shipMax(ctx, 'uk', b!).hp * 0.4);
    expect(side.ships).toHaveLength(s.nations.uk!.fleet.length - 1);
  });

  it('a war game removes sunk ships and keeps damage; nothing resets', () => {
    const s0 = newGame();
    const end = runBattle(createBattle(fleetBattleSetup(ctx, s0, 'uk', 'germany')), createRng(3));
    const s1 = applyBattleResult(ctx, s0, end, ['uk', 'germany']);
    for (const [side, id] of [[0, 'uk'], [1, 'germany']] as const) {
      const sunk = end.ships.filter((x) => x.side === side && x.status === 'sunk').length;
      expect(s1.nations[id]!.fleet).toHaveLength(s0.nations[id]!.fleet.length - sunk);
      for (const result of end.ships.filter((x) => x.side === side && x.status !== 'sunk')) {
        const ship = s1.nations[id]!.fleet.find((x) => x.id === result.refId)!;
        const max = shipMax(ctx, id, ship);
        if (result.hp < max.hp - 1e-6) expect(ship.hp).toBeCloseTo(result.hp);
        else expect(ship.hp).toBeUndefined();
      }
    }
    expect(s1.events.filter((e) => e.kind === 'battle')).toHaveLength(2);
    // The next battle starts from the damaged fleets.
    const again = fleetBattleSetup(ctx, s1, 'uk', 'germany');
    expect(again.sides[0].ships.length + again.sides[1].ships.length).toBe(
      s1.nations.uk!.fleet.length + s1.nations.germany!.fleet.length,
    );
  });

  it('the AI sends its damaged ships to dock', () => {
    const s = damage(newGame(), 2, 0.5);
    // Pretend the British fleet is the AI's to check its orders.
    const cmds = aiCommands(ctx, s, 'uk');
    expect(cmds[0]).toEqual({ type: 'setRepair', ships: 'damaged', repairing: true });
  });
});

describe('era names', () => {
  it('a nation can carry an era name', () => {
    const s = createGame(ctx, { playerId: 'russia', rivalId: 'germany', startYear: 1936, names: { russia: { name: 'Soviet Union', adjective: 'Soviet' } } });
    expect(nationName(ctx, s, 'russia')).toEqual({ name: 'Soviet Union', adjective: 'Soviet' });
    expect(nationName(ctx, s, 'germany')).toEqual({ name: 'Germany', adjective: 'German' });
    expect(fleetSide(ctx, s, 'russia').name).toBe('Soviet Navy');
  });
});

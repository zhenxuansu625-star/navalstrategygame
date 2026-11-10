import { describe, expect, it } from 'vitest';
import { defaultBattleSetup } from '../src/sim/scenario';
import { createBattle, formatLogEvent, runBattle, step } from '../src/sim/battle';
import type { BattleSetup, BattleState, ShipStats, SideSetup } from '../src/sim/battle';
import { createRng, rngFromState } from '../src/sim/rng';
import { BATTLE_CONFIG } from '../src/data/battle';
import { stats, TEST_CONFIG as cfg } from './helpers';

function side(name: string, ships: Array<[string, ShipStats]>, aggressiveness: SideSetup['aggressiveness'] = 'mediumRisk'): SideSetup {
  return { name, aggressiveness, ships: ships.map(([n, s]) => ({ name: n, className: s.line === 'screen' ? 'Screen' : 'Capital', stats: s })) };
}

const gunship = (o: Partial<ShipStats> = {}) => stats({ heavyAttack: 20, heavyPiercing: 20, ...o });

const DEFAULT_SCENARIO = defaultBattleSetup();

describe('battle engine', () => {
  it('is deterministic for a given seed', () => {
    const a = runBattle(createBattle(DEFAULT_SCENARIO), createRng(123));
    const b = runBattle(createBattle(DEFAULT_SCENARIO), createRng(123));
    expect(a).toEqual(b);
  });

  it('different seeds give different battles', () => {
    const a = runBattle(createBattle(DEFAULT_SCENARIO), createRng(1));
    const b = runBattle(createBattle(DEFAULT_SCENARIO), createRng(2));
    expect(a.log).not.toEqual(b.log);
  });

  it('does not mutate the input state', () => {
    const s0 = createBattle(DEFAULT_SCENARIO);
    const snapshot = structuredClone(s0);
    step(s0, {}, createRng(5));
    expect(s0).toEqual(snapshot);
  });

  it('runs until one fleet has no ships left, well before the stalemate limit', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const end = runBattle(createBattle(DEFAULT_SCENARIO), createRng(seed));
      expect(end.result).toBeDefined();
      expect(end.log.at(-1)?.type).toBe('end');
      expect(end.hour).toBeLessThan(BATTLE_CONFIG.maxHours);
      const left = (side: 0 | 1) => end.ships.filter((x) => x.side === side && (x.status === 'active' || x.status === 'retreating')).length;
      // A fleet is only beaten once every ship is sunk or has escaped.
      expect(left(0) === 0 || left(1) === 0).toBe(true);
      if (end.result!.winner !== 'draw') expect(left(end.result!.winner === 0 ? 1 : 0)).toBe(0);
    }
  });

  it('keeps fighting past hour 24', () => {
    const lengths = Array.from({ length: 100 }, (_, i) => runBattle(createBattle(DEFAULT_SCENARIO), createRng(i + 1)).hour);
    expect(Math.max(...lengths)).toBeGreaterThan(24);
  });

  it('says whether the loser was destroyed or withdrew', () => {
    const fight = (aggressiveness: SideSetup['aggressiveness']) =>
      runBattle(
        createBattle({
          sides: [
            side('Hunters', Array.from({ length: 6 }, (_, i) => [`H${i}`, gunship({ speed: 40 })] as [string, ShipStats]), 'alwaysEngage'),
            side('Prey', [['P', stats({ hp: 60, org: 50, speed: 10 })]], aggressiveness),
          ],
        }),
        createRng(2),
        cfg,
      ).result!;
    const destroyed = fight('alwaysEngage');
    expect(destroyed.winner).toBe(0);
    expect(destroyed.reason).toBe('Prey was destroyed.');

    const fled = Array.from({ length: 20 }, (_, i) =>
      runBattle(
        createBattle({
          sides: [
            side('Hunters', [['H', gunship({ heavyAttack: 10, speed: 10 })]], 'alwaysEngage'),
            side('Prey', [['P', stats({ hp: 500, org: 50, speed: 40 })]], 'lowRisk'),
          ],
        }),
        createRng(i + 1),
        { ...cfg, maxHours: 500 },
      ).result!,
    ).find((r) => r.reason.includes('withdrawn'));
    expect(fled?.winner).toBe(0);
    expect(fled?.reason).toBe('Prey has withdrawn from the battle (1 escaped, 0 sunk).');
  });

  it('fleets that cannot fire at each other lose contact', () => {
    const harmless = (n: string): [string, ShipStats] => [n, stats()]; // no weapons at all
    const end = runBattle(
      createBattle({ sides: [side('A', [harmless('a')], 'alwaysEngage'), side('B', [harmless('b')], 'alwaysEngage')] }),
      createRng(1),
      cfg,
    );
    expect(end.hour).toBe(cfg.submarines.quietHoursLimit);
    expect(end.result).toMatchObject({ winner: 'draw' });
    expect(end.result!.reason).toContain('lost contact');
  });

  it('stops a true stalemate at the safety limit as a draw', () => {
    // Both sides fire, but their ships are far too tough to sink in time.
    const tough = (n: string): [string, ShipStats] => [n, stats({ hp: 1e9, org: 1e9, lightAttack: 1, lightPiercing: 0, armour: 50 })];
    const end = runBattle(
      createBattle({ sides: [side('A', [tough('a')], 'alwaysEngage'), side('B', [tough('b')], 'alwaysEngage')] }),
      createRng(1),
      { ...cfg, maxHours: 30 },
    );
    expect(end.hour).toBe(30);
    expect(end.result).toMatchObject({ winner: 'draw' });
    expect(end.result!.reason).toContain('Stalemate');
  });

  it('ships can start a battle already damaged and keep their campaign id', () => {
    const s0 = createBattle({
      sides: [
        { name: 'A', aggressiveness: 'alwaysEngage', ships: [{ name: 'a', className: 'x', refId: 's7', hp: 40, org: 10, stats: stats({ hp: 100, org: 50 }) }] },
        { name: 'B', aggressiveness: 'alwaysEngage', ships: [{ name: 'b', className: 'x', hp: 999, stats: stats({ hp: 100 }) }] },
      ],
    });
    expect(s0.ships[0]).toMatchObject({ hp: 40, org: 10, refId: 's7' });
    expect(s0.ships[1]!.hp).toBe(100); // never above the maximum
  });

  it('state survives a JSON round-trip and continues identically', () => {
    const rng = createRng(77);
    let s: BattleState = createBattle(DEFAULT_SCENARIO);
    for (let i = 0; i < 3; i++) s = step(s, {}, rng);
    const saved = JSON.stringify({ state: s, rng: rng.getState() });

    const direct = runBattle(s, rng);
    const loaded = JSON.parse(saved) as { state: BattleState; rng: number };
    const resumed = runBattle(loaded.state, rngFromState(loaded.rng));
    expect(resumed).toEqual(direct);
  });

  it('a finished battle does not advance', () => {
    const end = runBattle(createBattle(DEFAULT_SCENARIO), createRng(9));
    expect(step(end, {}, createRng(1))).toBe(end);
  });

  it('sunk ships stop firing and stay sunk', () => {
    const rng = createRng(11);
    let s = createBattle(DEFAULT_SCENARIO);
    const firedWhenSunk = new Map<string, number>();
    while (!s.result) {
      s = step(s, {}, rng);
      for (const ship of s.ships) {
        if (ship.status === 'sunk') {
          expect(ship.hp).toBe(0);
          const prev = firedWhenSunk.get(ship.id);
          if (prev === undefined) firedWhenSunk.set(ship.id, ship.shotsFired);
          else expect(ship.shotsFired).toBe(prev);
        }
      }
    }
  });

  it('a ship retreats once HP or org drops below the fleet threshold', () => {
    // A lone target with medium risk (50%) facing overwhelming fire.
    const setup: BattleSetup = {
      sides: [
        side('Attackers', Array.from({ length: 6 }, (_, i) => [`A${i}`, gunship()] as [string, ShipStats])),
        side('Defender', [['D', stats({ hp: 1000, org: 50, armour: 0 })]]),
      ],
    };
    const rng = createRng(4);
    let s = createBattle(setup);
    while (!s.result) {
      const before = s.ships.find((x) => x.name === 'D')!;
      s = step(s, {}, rng, cfg);
      const d = s.ships.find((x) => x.name === 'D')!;
      if (before.status === 'active' && d.status === 'retreating') {
        expect(d.hp / d.stats.hp < 0.5 || d.org / d.stats.org < 0.5).toBe(true);
        expect(s.log.some((e) => e.type === 'retreat' && e.ship === 'D')).toBe(true);
        return;
      }
      if (d.status === 'active') expect(d.org / d.stats.org).toBeGreaterThanOrEqual(0.5);
    }
    throw new Error('defender never retreated');
  });

  it('always-engage ships never retreat', () => {
    const setup: BattleSetup = {
      sides: [
        side('A', [['A1', gunship()], ['A2', gunship()]], 'alwaysEngage'),
        side('B', [['B1', gunship()], ['B2', gunship()]], 'alwaysEngage'),
      ],
    };
    for (let seed = 1; seed <= 20; seed++) {
      const end = runBattle(createBattle(setup), createRng(seed), cfg);
      expect(end.ships.every((x) => x.status !== 'retreating' && x.status !== 'escaped')).toBe(true);
    }
  });

  it('screens draw fire away from capitals, and unscreened fleets get no protection', () => {
    const attackers = side('Attackers', Array.from({ length: 4 }, (_, i) => [`A${i}`, gunship()] as [string, ShipStats]), 'alwaysEngage');
    const capital = (): [string, ShipStats] => ['Cap', stats({ hp: 5000, org: 5000, visibility: 30 })];
    const screen = (n: number): [string, ShipStats] => [`S${n}`, stats({ line: 'screen', hp: 5000, org: 5000, visibility: 10 })];

    const damageToCapital = (setup: BattleSetup) => {
      let screened = 0;
      let capitalHpLost = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const end = runBattle(createBattle(setup), createRng(seed), { ...cfg, maxHours: 5 });
        for (const e of end.log) if (e.type === 'fire' && e.side === 0) screened += e.screened;
        const cap = end.ships.find((x) => x.name === 'Cap')!;
        capitalHpLost += cap.stats.hp - cap.hp;
      }
      return { screened, capitalHpLost };
    };

    const unscreened = damageToCapital({ sides: [attackers, side('D', [capital()], 'alwaysEngage')] });
    const screenedFleet = damageToCapital({
      sides: [attackers, side('D', [capital(), screen(1), screen(2), screen(3)], 'alwaysEngage')],
    });
    expect(unscreened.screened).toBe(0);
    expect(screenedFleet.screened).toBeGreaterThan(0);
    expect(screenedFleet.capitalHpLost).toBeLessThan(unscreened.capitalHpLost * 0.7);
  });

  it('logs a non-piercing hit once per attacker class, weapon and target class', () => {
    const setup: BattleSetup = {
      sides: [
        side('A', [['A1', stats({ lightAttack: 10, lightPiercing: 1 })], ['A2', stats({ lightAttack: 10, lightPiercing: 1 })]], 'alwaysEngage'),
        side('B', [['B1', stats({ armour: 50, hp: 5000 })]], 'alwaysEngage'),
      ],
    };
    const end = runBattle(createBattle(setup), createRng(1), { ...cfg, maxHours: 10 });
    expect(end.ships.filter((x) => x.side === 0).reduce((n, x) => n + x.nonPiercingHits, 0)).toBeGreaterThan(1);
    expect(end.log.filter((e) => e.type === 'bounce')).toHaveLength(1);
  });

  it('every log event formats to a sentence', () => {
    const end = runBattle(createBattle(DEFAULT_SCENARIO), createRng(3));
    for (const e of end.log) expect(formatLogEvent(end, e).length).toBeGreaterThan(10);
  });
});

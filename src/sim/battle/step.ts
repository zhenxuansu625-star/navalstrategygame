/**
 * Hourly battle tick. `step(state, orders, rng)` returns a new state and never
 * mutates its input. Within an hour, every ship fires based on the state at the
 * start of the hour and damage is applied simultaneously, so array order never
 * favours one side.
 */
import { AGGRESSIVENESS, BATTLE_CONFIG, type BattleConfig } from '../../data/battle';
import { pickWeighted, type Rng } from '../rng';
import {
  airStrike,
  attackOf,
  capitalReachChance,
  carrierReachChance,
  escapeChance,
  hitChance,
  hitDamage,
  isAirWaveHour,
  retreatReason,
} from './math';
import {
  ATTACK_TYPES,
  type AttackType,
  type BattleOrders,
  type BattleSetup,
  type BattleState,
  type LogEvent,
  type ShipState,
  type SideIndex,
} from './types';

export function createBattle(setup: BattleSetup): BattleState {
  const ships: ShipState[] = [];
  setup.sides.forEach((side, sideIndex) => {
    side.ships.forEach((s, i) => {
      ships.push({
        id: `${sideIndex}-${i}`,
        name: s.name,
        className: s.className,
        ...(s.hullClass ? { hullClass: s.hullClass } : {}),
        side: sideIndex as SideIndex,
        stats: { ...s.stats },
        hp: s.stats.hp,
        org: s.stats.org,
        planes: s.stats.airWing ?? 0,
        status: 'active',
        shotsFired: 0,
        hits: 0,
        nonPiercingHits: 0,
        damageDealt: 0,
      });
    });
  });
  const describe = (i: 0 | 1) => {
    const side = setup.sides[i];
    return `${side.name} (${side.ships.length} ships, ${AGGRESSIVENESS[side.aggressiveness].label})`;
  };
  return {
    hour: 0,
    sides: [
      { name: setup.sides[0].name, aggressiveness: setup.sides[0].aggressiveness },
      { name: setup.sides[1].name, aggressiveness: setup.sides[1].aggressiveness },
    ],
    ships,
    log: [{ hour: 0, type: 'start', text: `Battle joined: ${describe(0)} vs ${describe(1)}.` }],
    loggedBounces: [],
  };
}

export const isPresent = (s: ShipState) => s.status === 'active' || s.status === 'retreating';
const other = (side: SideIndex): SideIndex => (side === 0 ? 1 : 0);

interface PendingDamage {
  hp: number;
  org: number;
  /** Damage per attacker this hour, to credit a sinking. */
  byAttacker: Map<string, number>;
}

export function step(
  state: BattleState,
  _orders: BattleOrders,
  rng: Rng,
  cfg: BattleConfig = BATTLE_CONFIG,
): BattleState {
  if (state.result) return state;
  const next: BattleState = structuredClone(state);
  next.hour += 1;
  const hour = next.hour;
  const log: LogEvent[] = [];
  const byId = new Map(next.ships.map((s) => [s.id, s]));

  // 1. Ships that began retreating in an earlier hour try to slip away.
  for (const ship of next.ships) {
    if (ship.status !== 'retreating') continue;
    const fastest = fastestActiveSpeed(next.ships, other(ship.side));
    if (rng.next() < escapeChance(cfg, ship.stats.speed, fastest)) {
      ship.status = 'escaped';
      ship.leftAtHour = hour;
      log.push({ hour, type: 'escaped', side: ship.side, ship: ship.name });
    }
  }

  // 2. Gunfire and torpedoes, resolved against the start-of-hour picture.
  const pending = new Map<string, PendingDamage>();
  for (const side of [0, 1] as const) {
    const enemySide = other(side);
    const targets = next.ships.filter((s) => s.side === enemySide && isPresent(s));
    if (targets.length === 0) continue;
    const enemyScreens = targets.filter((s) => s.status === 'active' && s.stats.line === 'screen');
    const enemyCapitals = targets.filter((s) => s.stats.line === 'capital').length;
    const enemyCarriers = targets.filter((s) => s.stats.line === 'carrier').length;
    const enemyCoveringCapitals = targets.filter((s) => s.status === 'active' && s.stats.line === 'capital');
    let shots = 0;
    let hits = 0;
    let hpDamage = 0;
    let orgDamage = 0;
    let screened = 0;

    for (const shooter of next.ships) {
      if (shooter.side !== side || shooter.status !== 'active') continue;
      for (const attackType of ATTACK_TYPES) {
        const { attack, piercing } = attackOf(shooter.stats, attackType);
        if (attack <= 0) continue;

        let target = pickWeighted(rng, targets, (t) => targetWeight(cfg, attackType, t));
        if (!target) continue;
        // Screens shield both capitals and carriers; capitals in turn shield the carriers.
        if (target.stats.line !== 'screen' && enemyScreens.length > 0) {
          const reach = capitalReachChance(cfg, attackType, enemyScreens.length, enemyCapitals + enemyCarriers);
          if (rng.next() >= reach) {
            target = pickWeighted(rng, enemyScreens, (t) => t.stats.visibility) ?? target;
            screened += 1;
          }
        }
        if (target.stats.line === 'carrier' && enemyCoveringCapitals.length > 0) {
          const reach = carrierReachChance(cfg, attackType, enemyCoveringCapitals.length, enemyCarriers);
          if (rng.next() >= reach) {
            target = pickWeighted(rng, enemyCoveringCapitals, (t) => t.stats.visibility) ?? target;
            screened += 1;
          }
        }

        shots += 1;
        shooter.shotsFired += 1;
        if (rng.next() >= hitChance(cfg, attackType, shooter.stats, target.stats)) continue;

        const dmg = hitDamage(cfg, attack, piercing, target.stats, rng.next());
        hits += 1;
        hpDamage += dmg.hp;
        orgDamage += dmg.org;
        shooter.hits += 1;
        shooter.damageDealt += dmg.hp;
        const p = pending.get(target.id) ?? { hp: 0, org: 0, byAttacker: new Map<string, number>() };
        p.hp += dmg.hp;
        p.org += dmg.org;
        p.byAttacker.set(shooter.id, (p.byAttacker.get(shooter.id) ?? 0) + dmg.hp);
        pending.set(target.id, p);

        if (!dmg.pierced) {
          shooter.nonPiercingHits += 1;
          const key = `${shooter.className}|${attackType}|${target.className}`;
          if (!next.loggedBounces.includes(key)) {
            next.loggedBounces.push(key);
            log.push({
              hour,
              type: 'bounce',
              side,
              attacker: shooter.name,
              attackerClass: shooter.className,
              attackType,
              piercing,
              target: target.name,
              targetClass: target.className,
              armour: target.stats.armour,
            });
          }
        }
      }
    }
    if (shots > 0) {
      log.push({ hour, type: 'fire', side, shots, hits, hpDamage, orgDamage, screened });
    }
  }

  // 2b. Carrier air strikes, also against the start-of-hour picture.
  if (isAirWaveHour(cfg, hour)) {
    for (const side of [0, 1] as const) {
      const enemySide = other(side);
      const targets = next.ships.filter((s) => s.side === enemySide && isPresent(s));
      if (targets.length === 0) continue;
      const fleetAa = targets.reduce((sum, t) => sum + t.stats.aa, 0);
      for (const carrier of next.ships) {
        if (carrier.side !== side || carrier.status !== 'active' || carrier.planes <= 0) continue;
        const target = pickWeighted(rng, targets, (t) => airTargetWeight(cfg, t));
        if (!target) continue;
        const strike = airStrike(cfg, carrier.planes, target.stats, fleetAa, rng.next());
        const launched = carrier.planes;
        carrier.planes -= strike.shotDown;
        carrier.damageDealt += strike.hp;
        carrier.hits += 1;
        const p = pending.get(target.id) ?? { hp: 0, org: 0, byAttacker: new Map<string, number>() };
        p.hp += strike.hp;
        p.org += strike.org;
        p.byAttacker.set(carrier.id, (p.byAttacker.get(carrier.id) ?? 0) + strike.hp);
        pending.set(target.id, p);
        log.push({
          hour,
          type: 'air',
          side,
          carrier: carrier.name,
          planes: launched,
          target: target.name,
          hpDamage: strike.hp,
          orgDamage: strike.org,
          pierced: strike.pierced,
          shotDown: strike.shotDown,
        });
      }
    }
  }

  // 3. Apply damage simultaneously; resolve sinkings.
  for (const [id, p] of pending) {
    const ship = byId.get(id)!;
    ship.hp = Math.max(0, ship.hp - p.hp);
    ship.org = Math.max(0, ship.org - p.org);
    if (ship.hp <= 0) {
      ship.status = 'sunk';
      ship.leftAtHour = hour;
      let topId = '';
      let top = -1;
      for (const [attackerId, d] of p.byAttacker) {
        if (d > top) {
          top = d;
          topId = attackerId;
        }
      }
      log.push({ hour, type: 'sunk', side: ship.side, ship: ship.name, by: byId.get(topId)?.name ?? 'unknown' });
    }
  }

  // 4. Damaged or shaken ships break off.
  for (const ship of next.ships) {
    if (ship.status !== 'active') continue;
    const threshold = AGGRESSIVENESS[next.sides[ship.side].aggressiveness].retreatThreshold;
    const reason = retreatReason(threshold, ship.hp, ship.stats.hp, ship.org, ship.stats.org);
    if (reason) {
      ship.status = 'retreating';
      ship.retreatReason = reason;
      log.push({
        hour,
        type: 'retreat',
        side: ship.side,
        ship: ship.name,
        reason,
        hpPct: Math.round((ship.hp / ship.stats.hp) * 100),
        orgPct: Math.round((ship.org / ship.stats.org) * 100),
      });
    }
  }

  // 5. Is the battle over?
  next.result = checkEnd(next, cfg);
  if (next.result) {
    log.push({ hour, type: 'end', winner: next.result.winner, reason: next.result.reason });
  }
  next.log.push(...log);
  return next;
}

function targetWeight(cfg: BattleConfig, attackType: AttackType, t: ShipState): number {
  const lineWeight = cfg.targeting.lineWeight[attackType][t.stats.line];
  const retreating = t.status === 'retreating' ? cfg.targeting.retreatingWeight : 1;
  return t.stats.visibility * lineWeight * retreating;
}

function airTargetWeight(cfg: BattleConfig, t: ShipState): number {
  const retreating = t.status === 'retreating' ? cfg.targeting.retreatingWeight : 1;
  return t.stats.visibility * cfg.air.lineWeight[t.stats.line] * retreating;
}

function fastestActiveSpeed(ships: ShipState[], side: SideIndex): number | null {
  let best: number | null = null;
  for (const s of ships) {
    if (s.side === side && s.status === 'active') best = Math.max(best ?? 0, s.stats.speed);
  }
  return best;
}

/**
 * The battle continues until a fleet has no ships left in it: every ship sunk
 * (destroyed) or escaped (withdrawn). Ships that are retreating are still in
 * the battle and can be caught. The only other ending is the stalemate safety
 * limit for fleets that cannot hurt each other.
 */
function checkEnd(state: BattleState, cfg: BattleConfig): BattleState['result'] {
  const ofSide = (side: SideIndex) => state.ships.filter((s) => s.side === side);
  const present = [ofSide(0).filter(isPresent).length, ofSide(1).filter(isPresent).length] as const;
  const hours = state.hour;
  const name = (i: SideIndex) => state.sides[i].name;

  const howLost = (side: SideIndex) => {
    const ships = ofSide(side);
    const sunk = ships.filter((s) => s.status === 'sunk').length;
    if (sunk === ships.length) return `${name(side)} was destroyed.`;
    return `${name(side)} has withdrawn from the battle (${ships.length - sunk} escaped, ${sunk} sunk).`;
  };

  if (present[0] === 0 && present[1] === 0) {
    return { winner: 'draw', hours, reason: 'Both fleets left the battle in the same hour.' };
  }
  for (const side of [0, 1] as const) {
    if (present[side] === 0) return { winner: other(side), hours, reason: howLost(side) };
  }
  if (hours >= cfg.maxHours) {
    return { winner: 'draw', hours, reason: `Stalemate after ${hours} hours: neither fleet could finish the other.` };
  }
  return undefined;
}

/** Run a battle to completion (auto-resolve). */
export function runBattle(state: BattleState, rng: Rng, cfg: BattleConfig = BATTLE_CONFIG): BattleState {
  let s = state;
  while (!s.result) s = step(s, {}, rng, cfg);
  return s;
}

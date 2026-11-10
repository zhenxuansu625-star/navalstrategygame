import type { AggressivenessId } from '../../data/battle';

export type AttackType = 'light' | 'heavy' | 'torpedo';
export const ATTACK_TYPES: readonly AttackType[] = ['light', 'heavy', 'torpedo'];

export type Line = 'screen' | 'capital';

/** Combat stats of one ship. Derived from a design (slice 2) or hard-coded presets. */
export interface ShipStats {
  line: Line;
  hp: number;
  org: number;
  /** Belt/deck armour; attacks with lower piercing deal heavily reduced damage. */
  armour: number;
  lightAttack: number;
  lightPiercing: number;
  heavyAttack: number;
  heavyPiercing: number;
  torpedoAttack: number;
  torpedoPiercing: number;
  /** Flat bonus to gun hit chance (e.g. 0.05 = +5 percentage points). */
  fireControl: number;
  /** Knots. */
  speed: number;
  /** Bigger ships are easier to see and hit. */
  visibility: number;
}

export type ShipStatus = 'active' | 'retreating' | 'escaped' | 'sunk';
export type SideIndex = 0 | 1;

export interface ShipState {
  id: string;
  name: string;
  /** Class or design name shown in the log, e.g. "Battleship". */
  className: string;
  /** Hull class, used only to pick the ship's silhouette in the UI. */
  hullClass?: string;
  side: SideIndex;
  stats: ShipStats;
  hp: number;
  org: number;
  status: ShipStatus;
  retreatReason?: 'hp' | 'org';
  /** Hour the ship sank or escaped. */
  leftAtHour?: number;
  shotsFired: number;
  hits: number;
  nonPiercingHits: number;
  damageDealt: number;
}

export interface SideState {
  name: string;
  aggressiveness: AggressivenessId;
}

export type LogEvent =
  | { hour: number; type: 'start'; text: string }
  | {
      hour: number;
      type: 'fire';
      side: SideIndex;
      shots: number;
      hits: number;
      hpDamage: number;
      orgDamage: number;
      /** Shots aimed at capitals that the enemy screens intercepted. */
      screened: number;
    }
  | {
      hour: number;
      type: 'bounce';
      side: SideIndex;
      attacker: string;
      attackerClass: string;
      attackType: AttackType;
      piercing: number;
      target: string;
      targetClass: string;
      armour: number;
    }
  | { hour: number; type: 'sunk'; side: SideIndex; ship: string; by: string }
  | { hour: number; type: 'retreat'; side: SideIndex; ship: string; reason: 'hp' | 'org'; hpPct: number; orgPct: number }
  | { hour: number; type: 'escaped'; side: SideIndex; ship: string }
  | { hour: number; type: 'end'; winner: SideIndex | 'draw'; reason: string };

export interface BattleResult {
  winner: SideIndex | 'draw';
  hours: number;
  reason: string;
}

/** The entire battle as one serialisable object. */
export interface BattleState {
  hour: number;
  sides: [SideState, SideState];
  ships: ShipState[];
  log: LogEvent[];
  /** Keys of (attacker class, attack type, target class) bounces already logged, to avoid spam. */
  loggedBounces: string[];
  result?: BattleResult;
}

/** Player orders for one tick. Empty for now; slice 3 adds full retreat and aggressiveness changes. */
export type BattleOrders = Record<string, never>;

export interface ShipSetup {
  name: string;
  className: string;
  hullClass?: string;
  stats: ShipStats;
}

export interface SideSetup {
  name: string;
  aggressiveness: AggressivenessId;
  ships: ShipSetup[];
}

export interface BattleSetup {
  sides: [SideSetup, SideSetup];
}

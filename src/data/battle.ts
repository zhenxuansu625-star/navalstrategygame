/**
 * Battle tuning numbers. Every balance value used by the battle engine lives
 * here; the engine itself contains no magic numbers.
 */
import type { AttackType, Line } from '../sim/battle/types';

export interface BattleConfig {
  /** Battle ends inconclusively after this many hourly ticks. */
  maxHours: number;
  hit: {
    /** Base hit chance per attack type, before modifiers. */
    base: Record<AttackType, number>;
    /** Added per point of target visibility above the reference value. */
    visibilityPerPoint: number;
    referenceVisibility: number;
    /** Subtracted per knot of target speed above the reference value. */
    speedPerKnot: number;
    referenceSpeed: number;
    /** Extra penalty when heavy guns fire at small, nimble screens. */
    heavyVsScreenPenalty: number;
    /** Fire control applies to these attack types (not torpedoes). */
    fireControlApplies: Record<AttackType, boolean>;
    min: number;
    max: number;
  };
  damage: {
    /** Damage is multiplied by a uniform roll in [1 - variance, 1 + variance]. */
    variance: number;
    /** Damage multiplier when piercing is below the target's armour. */
    underPierceMultiplier: number;
  };
  organisation: {
    /**
     * Org lost = (raw damage / target max HP) * target max org * multiplier.
     * Above 1, crews lose cohesion faster than ships lose HP.
     */
    damageMultiplier: number;
    /** Multiplier used instead when the hit did not pierce: shells still shake the crew. */
    underPierceMultiplier: number;
  };
  targeting: {
    /** Preference of each attack type for each enemy line (multiplies visibility). */
    lineWeight: Record<AttackType, Record<Line, number>>;
    /** Weight multiplier for ships that are already retreating. */
    retreatingWeight: number;
  };
  screening: {
    /** Screens needed per capital ship for full screening. */
    screensPerCapital: number;
    /** At full screening, chance a shot aimed at a capital is intercepted by a screen. */
    protection: Record<AttackType, number>;
  };
  escape: {
    base: number;
    /** Added per knot the retreating ship is faster than the fastest enemy. */
    perKnot: number;
    min: number;
    max: number;
  };
}

export const BATTLE_CONFIG: BattleConfig = {
  maxHours: 24,
  hit: {
    base: { light: 0.35, heavy: 0.3, torpedo: 0.18 },
    visibilityPerPoint: 0.008,
    referenceVisibility: 20,
    speedPerKnot: 0.01,
    referenceSpeed: 25,
    heavyVsScreenPenalty: 0.1,
    fireControlApplies: { light: true, heavy: true, torpedo: false },
    min: 0.05,
    max: 0.9,
  },
  damage: {
    variance: 0.25,
    underPierceMultiplier: 0.15,
  },
  organisation: {
    damageMultiplier: 1.2,
    underPierceMultiplier: 0.5,
  },
  targeting: {
    lineWeight: {
      light: { screen: 2, capital: 1 },
      heavy: { screen: 1, capital: 2 },
      torpedo: { screen: 0.5, capital: 2 },
    },
    retreatingWeight: 0.5,
  },
  screening: {
    screensPerCapital: 3,
    protection: { light: 0.6, heavy: 0.6, torpedo: 0.9 },
  },
  escape: {
    base: 0.35,
    perKnot: 0.05,
    min: 0.05,
    max: 0.95,
  },
};

/** Fleet aggressiveness: ships retreat when HP or org fraction falls below the threshold. */
export const AGGRESSIVENESS = {
  lowRisk: { label: 'Low risk', retreatThreshold: 0.75 },
  mediumRisk: { label: 'Medium risk', retreatThreshold: 0.5 },
  highRisk: { label: 'High risk', retreatThreshold: 0.25 },
  alwaysEngage: { label: 'Always engage', retreatThreshold: 0 },
} as const;

export type AggressivenessId = keyof typeof AGGRESSIVENESS;

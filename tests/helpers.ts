import type { BattleConfig } from '../src/data/battle';
import { BATTLE_CONFIG } from '../src/data/battle';
import type { ShipStats } from '../src/sim/battle/types';

/** A config with round numbers so tests pin exact maths, independent of balance tuning. */
export const TEST_CONFIG: BattleConfig = {
  ...BATTLE_CONFIG,
  maxHours: 24,
  hit: {
    base: { light: 0.4, heavy: 0.3, torpedo: 0.2 },
    visibilityPerPoint: 0.01,
    referenceVisibility: 20,
    speedPerKnot: 0.01,
    referenceSpeed: 25,
    heavyVsScreenPenalty: 0.1,
    fireControlApplies: { light: true, heavy: true, torpedo: false },
    min: 0.05,
    max: 0.9,
  },
  damage: { variance: 0.25, underPierceMultiplier: 0.1 },
  organisation: { damageMultiplier: 1, underPierceMultiplier: 0.5 },
  screening: { screensPerCapital: 3, protection: { light: 0.5, heavy: 0.5, torpedo: 0.8 } },
  escape: { base: 0.4, perKnot: 0.05, min: 0.05, max: 0.95 },
};

export function stats(overrides: Partial<ShipStats> = {}): ShipStats {
  return {
    line: 'capital',
    hp: 100,
    org: 50,
    armour: 10,
    lightAttack: 0,
    lightPiercing: 0,
    heavyAttack: 0,
    heavyPiercing: 0,
    torpedoAttack: 0,
    torpedoPiercing: 0,
    fireControl: 0,
    speed: 25,
    visibility: 20,
    ...overrides,
  };
}

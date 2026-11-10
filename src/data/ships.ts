/** Hard-coded ship classes for the slice-1 battle sandbox (circa 1915). */
import type { ShipStats } from '../sim/battle/types';

export type ShipClassId = 'destroyer' | 'lightCruiser' | 'heavyCruiser' | 'battlecruiser' | 'battleship';

export interface ShipClass {
  name: string;
  stats: ShipStats;
}

export const SHIP_CLASSES: Record<ShipClassId, ShipClass> = {
  destroyer: {
    name: 'Destroyer',
    stats: {
      line: 'screen', hp: 40, org: 40, armour: 2,
      lightAttack: 5, lightPiercing: 4, heavyAttack: 0, heavyPiercing: 0,
      torpedoAttack: 30, torpedoPiercing: 40,
      fireControl: 0, speed: 34, visibility: 6,
    },
  },
  lightCruiser: {
    name: 'Light cruiser',
    stats: {
      line: 'screen', hp: 80, org: 40, armour: 6,
      lightAttack: 12, lightPiercing: 8, heavyAttack: 0, heavyPiercing: 0,
      torpedoAttack: 12, torpedoPiercing: 40,
      fireControl: 0.02, speed: 30, visibility: 12,
    },
  },
  heavyCruiser: {
    name: 'Heavy cruiser',
    stats: {
      line: 'capital', hp: 140, org: 40, armour: 12,
      lightAttack: 6, lightPiercing: 6, heavyAttack: 14, heavyPiercing: 18,
      torpedoAttack: 0, torpedoPiercing: 0,
      fireControl: 0.03, speed: 31, visibility: 20,
    },
  },
  battlecruiser: {
    name: 'Battlecruiser',
    stats: {
      line: 'capital', hp: 210, org: 40, armour: 18,
      lightAttack: 6, lightPiercing: 6, heavyAttack: 28, heavyPiercing: 30,
      torpedoAttack: 0, torpedoPiercing: 0,
      fireControl: 0.04, speed: 28, visibility: 30,
    },
  },
  battleship: {
    name: 'Battleship',
    stats: {
      line: 'capital', hp: 280, org: 40, armour: 30,
      lightAttack: 8, lightPiercing: 6, heavyAttack: 32, heavyPiercing: 32,
      torpedoAttack: 0, torpedoPiercing: 0,
      fireControl: 0.04, speed: 21, visibility: 32,
    },
  },
};

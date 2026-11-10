import type { Line, ShipStats } from '../battle/types';

export type HullClass =
  | 'destroyer'
  | 'lightCruiser'
  | 'heavyCruiser'
  | 'battlecruiser'
  | 'battleship'
  | 'superHeavy'
  | 'carrier';

export type ModuleCategory =
  | 'fireControl'
  | 'engine'
  | 'armour'
  | 'lightBattery'
  | 'mediumBattery'
  | 'heavyBattery'
  | 'superHeavyBattery'
  | 'secondary'
  | 'dualPurpose'
  | 'torpedo'
  | 'aa'
  | 'asw'
  | 'sensor'
  | 'extraArmour'
  | 'hangar';

export type SlotGroup = 'fixed' | 'main' | 'deck' | 'secondary' | 'custom';

export interface SlotDef {
  id: string;
  label: string;
  group: SlotGroup;
  accepts: ModuleCategory[];
  required: boolean;
}

export interface Cost {
  /** Production points; dockyards turn these into ships. */
  production: number;
  steel: number;
  chromium: number;
}

export interface Hull {
  id: string;
  name: string;
  hullClass: HullClass;
  line: Line;
  year: number;
  hp: number;
  org: number;
  armour: number;
  visibility: number;
  /** Knots before engine and module modifiers. */
  speed: number;
  cost: Cost;
  slots: SlotDef[];
}

/** Stats a module adds to a design. Piercing values combine by maximum, everything else adds. */
export interface ModuleStats {
  hp: number;
  armour: number;
  lightAttack: number;
  lightPiercing: number;
  heavyAttack: number;
  heavyPiercing: number;
  torpedoAttack: number;
  torpedoPiercing: number;
  fireControl: number;
  speed: number;
  visibility: number;
  aa: number;
  surfaceDetection: number;
  subDetection: number;
  airWing: number;
}

export interface Module {
  id: string;
  name: string;
  category: ModuleCategory;
  year: number;
  stats: Partial<ModuleStats>;
  cost: Cost;
  /** If set, only these hull classes can mount the module. */
  hullClasses?: HullClass[];
}

/** A ship design: a hull plus the module chosen for each slot. Plain JSON. */
export interface Design {
  id: string;
  name: string;
  role: string;
  hullId: string;
  slots: Record<string, string | null>;
}

/** Battle stats plus stats that are shown in the designer but not used in battle yet. */
export interface DesignStats extends ShipStats {
  surfaceDetection: number;
  subDetection: number;
}

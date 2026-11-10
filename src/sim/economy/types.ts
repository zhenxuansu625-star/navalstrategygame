import type { AggressivenessId } from '../../data/battle';
import type { Design, HullClass } from '../designer/types';

export type BuildingType = 'civilianFactory' | 'dockyard' | 'infrastructure';
export type ResourceType = 'steel' | 'chromium';
export const RESOURCES: readonly ResourceType[] = ['steel', 'chromium'];

export interface GameDate {
  year: number;
  /** 1 to 12. */
  month: number;
  /** 1 to the length of the month. Older saves without a day count as the 1st. */
  day?: number;
}

/** Ship stats a nation trait can scale. */
export type ScalableStat = 'hp' | 'armour' | 'lightAttack' | 'heavyAttack' | 'torpedoAttack' | 'speed' | 'aa';

/**
 * Bonuses from nation traits. Every value is a fractional change:
 * +0.1 means 10% more (or, for consumer goods, 10 percentage points more).
 */
export interface Modifiers {
  constructionSpeed?: Partial<Record<BuildingType, number>>;
  /** Added to the share of civilian factories taken by consumer goods. */
  consumerGoods?: number;
  /** Dockyard output by hull class; "all" applies to every line. */
  dockyardOutput?: Partial<Record<HullClass | 'all', number>>;
  /** How fast production lines gain efficiency. */
  lineEfficiencyGain?: number;
  /** Resources gained per civilian factory on trade. */
  tradeYield?: number;
  /** Combat stats of ships this nation builds. */
  shipStats?: Partial<Record<ScalableStat, number>>;
}

export interface NationTrait {
  id: string;
  name: string;
  description: string;
  kind: 'strength' | 'weakness';
  modifiers: Modifiers;
  /** Set when the trait cannot take effect yet, e.g. submarines do not exist. */
  inactive?: string;
}

/** Which industrial strategy and fleet mix an AI nation follows. */
export interface AiProfile {
  /** Months of building civilian factories before switching to dockyards. */
  transitionMonth: number;
  /** Share of dockyards per hull class; classes with no available design are skipped. */
  fleetMix: Partial<Record<HullClass, number>>;
}

export interface NationDef {
  id: string;
  name: string;
  adjective: string;
  blurb: string;
  civilianFactories: number;
  dockyards: number;
  /** Building slots for factories and dockyards; infrastructure adds more. */
  buildingSlots: number;
  resources: Record<ResourceType, number>;
  /** Ships per hull class at the start; each becomes the newest preset available that year. */
  startingFleet: Partial<Record<HullClass, number>>;
  traits: NationTrait[];
  ai: AiProfile;
  shipNames: string[];
}

export interface ConstructionItem {
  id: string;
  building: BuildingType;
  /** Fixed when queued (infrastructure gets dearer with each level). */
  cost: number;
  progress: number;
}

export interface ProductionLine {
  id: string;
  /** Snapshot of the design: later edits in the designer do not change ships already ordered. */
  design: Design;
  /** Dockyards requested; fewer may be assigned if the nation runs short. */
  dockyards: number;
  /** 0 to 1; grows while the line runs, drops when retooled or expanded. */
  efficiency: number;
  /** Production points towards the next ship. */
  progress: number;
  built: number;
  /** Stop after this many ships; null runs until removed. */
  quantity: number | null;
}

export interface ShipRecord {
  id: string;
  name: string;
  design: Design;
  launched: GameDate;
  /** Current HP and organisation; left out while at full strength. */
  hp?: number;
  org?: number;
  /** Ordered into dock for repair: sits out battles until repaired. */
  repairing?: boolean;
}

export interface NationState {
  id: string;
  civilianFactories: number;
  dockyards: number;
  infrastructure: number;
  buildingSlots: number;
  resources: Record<ResourceType, number>;
  /** Civilian factories assigned to importing each resource. */
  trade: Record<ResourceType, number>;
  construction: ConstructionItem[];
  lines: ProductionLine[];
  fleet: ShipRecord[];
  nextId: number;
  /** Total production cost of every ship launched during the campaign. */
  producedValue: number;
  aggressiveness: AggressivenessId;
  /** Name for this nation in the chosen era, e.g. "Soviet Union" from 1922. */
  name?: string;
  adjective?: string;
  /** Standing order: keep the construction queue topped up with this building (and infrastructure when slots run out). */
  autoBuild?: 'civilianFactory' | 'dockyard' | null;
}

export interface GameEvent {
  date: GameDate;
  nationId: string;
  kind: 'building' | 'launch' | 'order' | 'repair' | 'battle';
  text: string;
}

/** The whole campaign as one serialisable object. */
export interface GameState {
  date: GameDate;
  /** Months since the campaign began. */
  turn: number;
  playerId: string;
  rivalId: string;
  nations: Record<string, NationState>;
  /** Most recent events, newest last. */
  events: GameEvent[];
}

export type Command =
  | { type: 'queueBuilding'; building: BuildingType }
  | { type: 'cancelBuilding'; itemId: string }
  | { type: 'moveBuilding'; itemId: string; to: number }
  | { type: 'addLine'; design: Design; dockyards: number; quantity?: number | null }
  | { type: 'removeLine'; lineId: string }
  | { type: 'moveLine'; lineId: string; to: number }
  | { type: 'setLineDockyards'; lineId: string; dockyards: number }
  | { type: 'setLineDesign'; lineId: string; design: Design }
  | { type: 'setTrade'; resource: ResourceType; factories: number }
  | { type: 'setAggressiveness'; aggressiveness: AggressivenessId }
  | { type: 'setAutoBuild'; building: 'civilianFactory' | 'dockyard' | null }
  /** Send ships to (or recall them from) repair. "damaged" means every ship below full HP. */
  | { type: 'setRepair'; ships: string[] | 'damaged' | 'all'; repairing: boolean };

/** Commands per nation for one month. */
export type Orders = Record<string, Command[]>;

/** How a nation's factories and dockyards are being used this month. */
export interface IndustryReport {
  consumerGoods: number;
  tradeFactories: number;
  constructionFactories: number;
  /** Factories working on each queue item, in queue order. */
  factoriesPerItem: number[];
  idleFactories: number;
  supply: Record<ResourceType, number>;
  demand: Record<ResourceType, number>;
  lines: LineReport[];
  idleDockyards: number;
  slotsUsed: number;
}

export interface LineReport {
  lineId: string;
  assigned: number;
  cap: number;
  /** 1 = fully supplied; lower when steel or chromium is short. */
  resourceFactor: number;
  /** Production points added per month right now. */
  output: number;
  cost: number;
  /** Months until the next ship at the current rate; null if stalled. */
  monthsToNext: number | null;
}

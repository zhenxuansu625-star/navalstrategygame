/** Economy tuning numbers. All balance values for the monthly turn live here. */
import type { Line } from '../sim/battle/types';
import type { BuildingType, ResourceType } from '../sim/economy/types';

export interface EconomyConfig {
  repair: {
    /** HP restored per month to a ship in dock, as a share of its maximum. */
    hpPerMonth: number;
    /** Organisation recovered per month by every ship, as a share of its maximum. */
    orgPerMonth: number;
    /** One repair berth per this many dockyards: only that many ships repair at once. */
    dockyardsPerBerth: number;
    minBerths: number;
  };
  construction: {
    /** Construction points one civilian factory adds per month. */
    outputPerFactory: number;
    /** A single project can use at most this many factories. */
    maxFactoriesPerProject: number;
    cost: Record<BuildingType, number>;
    /** Building slots added by one infrastructure level. */
    slotsPerInfrastructure: number;
    /** Each infrastructure level already built or queued makes the next one this much dearer. */
    infrastructureCostGrowth: number;
  };
  /** Share of civilian factories that make consumer goods and cannot build. */
  consumerGoodsShare: number;
  trade: {
    /** Resource units imported per civilian factory assigned. */
    perFactory: Record<ResourceType, number>;
  };
  production: {
    /** Most dockyards one line can use, by battle line of the design. */
    maxDockyardsPerLine: Record<Line, number>;
    efficiency: {
      /** Efficiency of a brand-new line. */
      base: number;
      max: number;
      /** Added per month while the line has dockyards. */
      gainPerMonth: number;
      /** Kept when retooling to another design on the same hull / same hull class. */
      retainSameHull: number;
      retainSameClass: number;
    };
    /** Output lost when a line gets none of a resource it needs (scaled by how short it is). */
    resourceShortfallPenalty: number;
  };
  ai: {
    /** The AI never puts more than this share of usable factories on trade. */
    maxTradeShare: number;
    /** Retool a line to a newer design only when the ship on the slip is less than this far along. */
    retoolBelowProgress: number;
    /** The AI does not open a capital-ship or carrier line with fewer dockyards than this. */
    minDockyardsBigShip: number;
  };
  /** How many events the state keeps. */
  eventLogLength: number;
}

export const ECONOMY: EconomyConfig = {
  repair: {
    hpPerMonth: 0.35,
    orgPerMonth: 1,
    dockyardsPerBerth: 4,
    minBerths: 2,
  },
  construction: {
    outputPerFactory: 100,
    maxFactoriesPerProject: 10,
    cost: { civilianFactory: 2700, dockyard: 9000, infrastructure: 1200 },
    slotsPerInfrastructure: 2,
    infrastructureCostGrowth: 0.35,
  },
  consumerGoodsShare: 0.25,
  trade: {
    perFactory: { steel: 10, chromium: 4 },
  },
  production: {
    maxDockyardsPerLine: { screen: 10, capital: 5, carrier: 5, submarine: 10 },
    efficiency: {
      base: 0.5,
      max: 1,
      gainPerMonth: 0.025,
      retainSameHull: 0.8,
      retainSameClass: 0.6,
    },
    resourceShortfallPenalty: 0.7,
  },
  ai: {
    maxTradeShare: 0.6,
    retoolBelowProgress: 0.15,
    minDockyardsBigShip: 3,
  },
  eventLogLength: 60,
};

export const BUILDING_NAMES: Record<BuildingType, string> = {
  civilianFactory: 'Civilian factory',
  dockyard: 'Naval dockyard',
  infrastructure: 'Infrastructure',
};

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Historical starting fleets for each campaign start date (1 January of the year).
 *
 * Counts are rounded approximations of ships in commission, cross-checked against
 * contemporary tabulations where available:
 *   - 1914: 1914-1918-online "Naval warfare", Hansard 22 April 1914 (Britain/Germany),
 *     naval-history.net (Japan); Britannica "Forces and resources of the combatant nations in 1914".
 *   - 1922: Britannica, Five-Power (Washington) Naval Limitation Treaty.
 *   - 1936: US in-service list for January 1935 and Navy active force levels for June 1938
 *     (history.navy.mil), interpolated.
 *   - 1939: naval-history.net (Royal Navy, September 1939), ww2-weapons.com "Fleets in 1939",
 *     contemporary press tables (Germany), Soviet figures from 1939-41 estimates.
 *   - 1890 and 1906: standard reference fleet lists, rounded more loosely.
 *
 * Simplifications:
 *   - Ships are counted by role: armoured cruisers and German "pocket battleships" as
 *     heavy cruisers, protected and scout cruisers as light cruisers, and in 1890 the
 *     larger torpedo boats stand in for destroyers (which did not exist yet).
 *   - Reserve fleets are mostly left out (the US had many more mothballed destroyers).
 *   - Each ship uses the preset of its era tier; if that preset is not yet available in
 *     the start year, it falls back to the newest earlier design of its class.
 */
import type { FleetSpec } from '../sim/economy/types';

export const STARTING_FLEETS: Record<string, Record<string, FleetSpec>> = {
  naval_race_1890: {
    uk: { battleship: { pre: 30 }, heavyCruiser: { pre: 10 }, lightCruiser: { pre: 30 }, destroyer: { pre: 40 } },
    germany: { battleship: { pre: 14 }, heavyCruiser: { pre: 2 }, lightCruiser: { pre: 12 }, destroyer: { pre: 50 } },
    // The "New Navy" had only begun: the first US battleships commissioned in 1895.
    usa: { heavyCruiser: { pre: 2 }, lightCruiser: { pre: 8 }, destroyer: { pre: 2 } },
    france: { battleship: { pre: 22 }, heavyCruiser: { pre: 6 }, lightCruiser: { pre: 25 }, destroyer: { pre: 60 } },
    // Japan's first battleships (Fuji class) arrived in 1897.
    japan: { lightCruiser: { pre: 10 }, destroyer: { pre: 20 } },
    italy: { battleship: { pre: 12 }, lightCruiser: { pre: 10 }, destroyer: { pre: 50 } },
    russia: { battleship: { pre: 12 }, heavyCruiser: { pre: 6 }, lightCruiser: { pre: 6 }, destroyer: { pre: 40 } },
    austria: { battleship: { pre: 8 }, lightCruiser: { pre: 6 }, destroyer: { pre: 30 } },
  },

  dreadnought_1906: {
    uk: { battleship: { pre: 47 }, heavyCruiser: { pre: 30 }, lightCruiser: { pre: 50 }, destroyer: { pre: 140 }, submarine: { pre: 35 } },
    germany: { battleship: { pre: 20 }, heavyCruiser: { pre: 6 }, lightCruiser: { pre: 28 }, destroyer: { pre: 50 } },
    usa: { battleship: { pre: 14 }, heavyCruiser: { pre: 8 }, lightCruiser: { pre: 15 }, destroyer: { pre: 16 }, submarine: { pre: 8 } },
    france: { battleship: { pre: 18 }, heavyCruiser: { pre: 18 }, lightCruiser: { pre: 20 }, destroyer: { pre: 45 }, submarine: { pre: 30 } },
    japan: { battleship: { pre: 11 }, heavyCruiser: { pre: 10 }, lightCruiser: { pre: 15 }, destroyer: { pre: 50 }, submarine: { pre: 5 } },
    italy: { battleship: { pre: 10 }, heavyCruiser: { pre: 7 }, lightCruiser: { pre: 10 }, destroyer: { pre: 15 }, submarine: { pre: 4 } },
    // After Tsushima (1905): the Baltic Fleet was gone.
    russia: { battleship: { pre: 6 }, heavyCruiser: { pre: 4 }, lightCruiser: { pre: 6 }, destroyer: { pre: 50 }, submarine: { pre: 15 } },
    austria: { battleship: { pre: 6 }, heavyCruiser: { pre: 3 }, lightCruiser: { pre: 5 }, destroyer: { pre: 10 } },
  },

  guns_of_august_1914: {
    uk: {
      battleship: { early: 18, pre: 40 },
      battlecruiser: { early: 9 },
      heavyCruiser: { pre: 34 },
      lightCruiser: { early: 35, pre: 40 },
      destroyer: { early: 150, pre: 70 },
      submarine: { early: 20, pre: 55 },
    },
    germany: {
      battleship: { early: 13, pre: 22 },
      battlecruiser: { early: 4 },
      heavyCruiser: { pre: 9 },
      lightCruiser: { early: 25, pre: 15 },
      destroyer: { early: 90, pre: 40 },
      submarine: { early: 20, pre: 8 },
    },
    usa: {
      battleship: { early: 10, pre: 22 },
      heavyCruiser: { pre: 12 },
      lightCruiser: { pre: 14 },
      destroyer: { early: 30, pre: 20 },
      submarine: { early: 10, pre: 20 },
    },
    france: {
      battleship: { early: 2, pre: 20 },
      heavyCruiser: { pre: 22 },
      lightCruiser: { pre: 6 },
      destroyer: { early: 50, pre: 31 },
      submarine: { early: 30, pre: 45 },
    },
    japan: {
      battleship: { early: 2, pre: 10 },
      battlecruiser: { early: 2 },
      heavyCruiser: { pre: 12 },
      lightCruiser: { early: 6, pre: 15 },
      destroyer: { early: 20, pre: 30 },
      submarine: { pre: 12 },
    },
    italy: {
      battleship: { early: 3, pre: 8 },
      heavyCruiser: { pre: 9 },
      lightCruiser: { early: 6, pre: 6 },
      destroyer: { early: 20, pre: 13 },
      submarine: { early: 10, pre: 12 },
    },
    // The Gangut-class dreadnoughts commissioned late in 1914.
    russia: {
      battleship: { pre: 8 },
      heavyCruiser: { pre: 6 },
      lightCruiser: { pre: 8 },
      destroyer: { early: 30, pre: 60 },
      submarine: { early: 5, pre: 20 },
    },
    austria: {
      battleship: { early: 3, pre: 9 },
      heavyCruiser: { pre: 3 },
      lightCruiser: { early: 4, pre: 3 },
      destroyer: { early: 18 },
      submarine: { early: 5 },
    },
  },

  washington_1922: {
    uk: {
      battleship: { early: 18 },
      battlecruiser: { early: 4 },
      carrier: { basic: 2 },
      heavyCruiser: { early: 3 },
      lightCruiser: { early: 45 },
      destroyer: { early: 180 },
      submarine: { early: 60 },
    },
    usa: {
      battleship: { early: 18 },
      carrier: { basic: 1 },
      heavyCruiser: { pre: 6 },
      lightCruiser: { pre: 10 },
      destroyer: { early: 150 },
      submarine: { early: 80 },
    },
    japan: {
      battleship: { early: 6 },
      battlecruiser: { early: 4 },
      carrier: { basic: 1 },
      heavyCruiser: { pre: 8 },
      lightCruiser: { early: 15 },
      destroyer: { early: 80 },
      submarine: { early: 40 },
    },
    france: {
      battleship: { early: 7, pre: 4 },
      heavyCruiser: { pre: 10 },
      lightCruiser: { early: 4 },
      destroyer: { early: 50 },
      submarine: { early: 50 },
    },
    italy: { battleship: { early: 5 }, heavyCruiser: { pre: 6 }, lightCruiser: { early: 10 }, destroyer: { early: 50 }, submarine: { early: 40 } },
    // Versailles limits: six old battleships, six cruisers, twelve destroyers and twelve torpedo boats, no submarines.
    germany: { battleship: { pre: 6 }, lightCruiser: { early: 6 }, destroyer: { early: 24 } },
    russia: { battleship: { early: 3 }, lightCruiser: { early: 2, pre: 2 }, destroyer: { early: 15 }, submarine: { early: 10 } },
  },

  road_to_war_1936: {
    uk: {
      battleship: { early: 10, basic: 2 },
      battlecruiser: { early: 3 },
      carrier: { basic: 6 },
      heavyCruiser: { basic: 15 },
      lightCruiser: { early: 30, basic: 10 },
      destroyer: { early: 70, basic: 80 },
      submarine: { early: 15, basic: 40 },
    },
    // Fifteen battleships (all WW1-era designs), Lexington, Saratoga and Ranger, sixteen
    // treaty cruisers, the ten Omaha-class light cruisers, and about 120 active destroyers.
    usa: {
      battleship: { early: 15 },
      carrier: { basic: 3 },
      heavyCruiser: { basic: 16 },
      lightCruiser: { early: 10 },
      destroyer: { early: 110, basic: 8 },
      submarine: { early: 30, basic: 25 },
    },
    japan: {
      battleship: { early: 6 },
      battlecruiser: { early: 3 },
      carrier: { basic: 4 },
      heavyCruiser: { basic: 12 },
      lightCruiser: { early: 17, basic: 4 },
      destroyer: { early: 40, basic: 50 },
      submarine: { early: 20, basic: 40 },
    },
    // Three "pocket battleships" (as heavy cruisers), two old battleships, six cruisers, the first U-boats.
    germany: { battleship: { pre: 2 }, heavyCruiser: { basic: 3 }, lightCruiser: { basic: 6 }, destroyer: { basic: 12 }, submarine: { basic: 24 } },
    italy: {
      battleship: { early: 4 },
      heavyCruiser: { basic: 7 },
      lightCruiser: { early: 2, basic: 12 },
      destroyer: { early: 20, basic: 50 },
      submarine: { basic: 60 },
    },
    france: {
      battleship: { early: 6 },
      carrier: { basic: 1 },
      heavyCruiser: { basic: 7 },
      lightCruiser: { early: 3, basic: 9 },
      destroyer: { early: 12, basic: 50 },
      submarine: { basic: 75 },
    },
    russia: { battleship: { early: 3 }, lightCruiser: { early: 4 }, destroyer: { early: 17 }, submarine: { basic: 100 } },
  },

  gathering_storm_1939: {
    // About 15 capital ships, 7 carriers, 60-plus cruisers, 180-plus destroyers and 60 submarines.
    uk: {
      battleship: { early: 10, basic: 2 },
      battlecruiser: { early: 3 },
      carrier: { basic: 7 },
      heavyCruiser: { basic: 15 },
      lightCruiser: { early: 25, basic: 20 },
      destroyer: { early: 60, basic: 110, improved: 10 },
      submarine: { early: 10, basic: 45 },
    },
    // 15 battleships, 5 carriers, 18 heavy and 19 light cruisers, 100-plus active destroyers, 50-plus submarines.
    usa: {
      battleship: { early: 15 },
      carrier: { basic: 5 },
      heavyCruiser: { basic: 18 },
      lightCruiser: { early: 10, basic: 9 },
      destroyer: { early: 60, basic: 60 },
      submarine: { early: 20, basic: 35 },
    },
    japan: {
      battleship: { early: 6 },
      battlecruiser: { early: 4 },
      carrier: { basic: 6 },
      heavyCruiser: { basic: 18 },
      lightCruiser: { early: 17, basic: 8 },
      destroyer: { early: 30, basic: 80 },
      submarine: { early: 10, basic: 50 },
    },
    // Scharnhorst and Gneisenau, two old battleships, three pocket battleships, six cruisers,
    // 16 destroyers and about 45 U-boats (57 by September).
    germany: {
      battleship: { improved: 2, pre: 2 },
      heavyCruiser: { basic: 3 },
      lightCruiser: { basic: 6 },
      destroyer: { basic: 16 },
      submarine: { basic: 20, improved: 25 },
    },
    italy: {
      battleship: { early: 4 },
      heavyCruiser: { basic: 7 },
      lightCruiser: { basic: 14 },
      destroyer: { early: 10, basic: 50 },
      submarine: { basic: 80, improved: 20 },
    },
    france: {
      battleship: { early: 5, basic: 1, improved: 1 },
      carrier: { basic: 1 },
      heavyCruiser: { basic: 7 },
      lightCruiser: { basic: 12 },
      destroyer: { early: 10, basic: 60 },
      submarine: { basic: 75 },
    },
    // The world's largest submarine force (160-plus), with three old battleships.
    russia: {
      battleship: { early: 3 },
      lightCruiser: { early: 4, basic: 2 },
      destroyer: { early: 17, basic: 15 },
      submarine: { basic: 150 },
    },
  },
};

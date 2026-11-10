/** Default sandbox fleets, built from preset designs. */
import type { FleetSetup } from '../sim/designer/fleet';

/**
 * Blue: fewer capitals but a strong destroyer screen.
 * Red: two battleships and two fast, thinly armoured battlecruisers.
 */
export const DEFAULT_FLEETS: [FleetSetup, FleetSetup] = [
  {
    name: 'Blue Fleet',
    aggressiveness: 'mediumRisk',
    ships: [
      { designId: 'preset_bb_1906', count: 2 },
      { designId: 'preset_ca_1915', count: 1 },
      { designId: 'preset_cl_1915', count: 2 },
      { designId: 'preset_dd_1915', count: 6 },
    ],
  },
  {
    name: 'Red Fleet',
    aggressiveness: 'mediumRisk',
    ships: [
      { designId: 'preset_bb_1906', count: 2 },
      { designId: 'preset_bc_1908', count: 2 },
      { designId: 'preset_cl_1915', count: 2 },
      { designId: 'preset_dd_1915', count: 5 },
    ],
  },
];

export interface Scenario {
  id: string;
  name: string;
  description: string;
  fleets: [FleetSetup, FleetSetup];
}

/** Ready-made test battles, loadable from the fleet editor. */
export const SCENARIOS: Scenario[] = [
  {
    id: 'default',
    name: 'Blue vs Red (1915)',
    description: 'Well-screened Blue against a heavier, thinly screened Red.',
    fleets: DEFAULT_FLEETS,
  },
  {
    id: 'jutland',
    name: 'Dreadnought clash (1916)',
    description: 'WW1 battle lines: dreadnoughts and battlecruisers with cruiser and destroyer screens on both sides.',
    fleets: [
      {
        name: 'Grand Fleet',
        aggressiveness: 'mediumRisk',
        ships: [
          { designId: 'preset_bb_1906', count: 5 },
          { designId: 'preset_bc_1908', count: 3 },
          { designId: 'preset_cl_1915', count: 3 },
          { designId: 'preset_dd_1915', count: 8 },
        ],
      },
      {
        name: 'High Seas Fleet',
        aggressiveness: 'mediumRisk',
        ships: [
          { designId: 'preset_bb_1906', count: 4 },
          { designId: 'preset_bb_1895', count: 1 },
          { designId: 'preset_bc_1908', count: 2 },
          { designId: 'preset_cl_1915', count: 4 },
          { designId: 'preset_dd_1915', count: 8 },
        ],
      },
    ],
  },
  {
    id: 'carriers',
    name: 'Carrier strike (1942)',
    description: 'A carrier task force against a battleship-heavy surface fleet. Air power vs big guns.',
    fleets: [
      {
        name: 'Carrier Task Force',
        aggressiveness: 'mediumRisk',
        ships: [
          { designId: 'preset_cv_1942', count: 3 },
          { designId: 'preset_bb_1936', count: 1 },
          { designId: 'preset_ca_1938', count: 2 },
          { designId: 'preset_cl_1938', count: 2 },
          { designId: 'preset_dd_1938', count: 6 },
        ],
      },
      {
        name: 'Battle Fleet',
        aggressiveness: 'mediumRisk',
        ships: [
          { designId: 'preset_sh_1940', count: 1 },
          { designId: 'preset_bb_1936', count: 3 },
          { designId: 'preset_ca_1938', count: 2 },
          { designId: 'preset_cl_1938', count: 2 },
          { designId: 'preset_dd_1938', count: 7 },
        ],
      },
    ],
  },
  {
    id: 'wolfpack',
    name: 'Wolfpack (1942)',
    description: 'Submarines hunt a battle group. Hidden until they fire; only depth charges can hit them.',
    fleets: [
      {
        name: 'Battle Group',
        aggressiveness: 'mediumRisk',
        ships: [
          { designId: 'preset_bb_1936', count: 2 },
          { designId: 'preset_cl_1938', count: 2 },
          { designId: 'preset_dd_1938', count: 6 },
        ],
      },
      {
        name: 'U-boat Wolfpack',
        aggressiveness: 'mediumRisk',
        ships: [{ designId: 'preset_ss_1938', count: 10 }],
      },
    ],
  },
];

/** Ship names handed out in order; later ships fall back to "<design> <n>". */
export const SHIP_NAMES: [string[], string[]] = [
  [
    'Colossus', 'Dominion', 'Warden', 'Swift', 'Arrow', 'Hound', 'Lance', 'Rapier', 'Sabre', 'Talon', 'Wasp',
    'Valiant', 'Resolute', 'Bulwark', 'Sentinel', 'Vigilant', 'Javelin', 'Harrier', 'Falcon', 'Kestrel',
    'Trident', 'Defiance', 'Majestic', 'Indomitable', 'Vanguard', 'Guardian', 'Ardent', 'Comet', 'Dart', 'Mercury',
  ],
  [
    'Konig', 'Kaiser', 'Blitz', 'Donner', 'Falke', 'Adler', 'Pfeil', 'Speer', 'Dolch', 'Axt',
    'Sturm', 'Greif', 'Hammer', 'Wolf', 'Luchs', 'Jaguar', 'Iltis', 'Kondor', 'Moewe', 'Seeadler',
    'Feuer', 'Panzer', 'Eisen', 'Hagel', 'Orkan', 'Tiger', 'Schwert', 'Lanze', 'Bussard', 'Sperber',
  ],
];

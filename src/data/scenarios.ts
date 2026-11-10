/** Default sandbox fleets, built from preset designs. */
import type { FleetSetup } from '../sim/designer/fleet';

/**
 * Blue: fewer capitals but a strong destroyer screen.
 * Red: heavier capital line (two battleships, two battlecruisers) with thin screens.
 */
export const DEFAULT_FLEETS: [FleetSetup, FleetSetup] = [
  {
    name: 'Blue Fleet',
    aggressiveness: 'mediumRisk',
    ships: [
      { designId: 'preset_bb_1915', count: 2 },
      { designId: 'preset_ca_1915', count: 1 },
      { designId: 'preset_cl_1915', count: 2 },
      { designId: 'preset_dd_1915', count: 6 },
    ],
  },
  {
    name: 'Red Fleet',
    aggressiveness: 'mediumRisk',
    ships: [
      { designId: 'preset_bb_1915', count: 2 },
      { designId: 'preset_bc_1916', count: 2 },
      { designId: 'preset_cl_1915', count: 2 },
      { designId: 'preset_dd_1915', count: 4 },
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

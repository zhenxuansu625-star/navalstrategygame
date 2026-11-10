/** Hard-coded fleets for the battle sandbox. */
import type { BattleSetup, ShipSetup } from '../sim/battle/types';
import { SHIP_CLASSES, type ShipClassId } from './ships';

function ship(classId: ShipClassId, name: string): ShipSetup {
  const c = SHIP_CLASSES[classId];
  return { name, className: c.name, stats: { ...c.stats } };
}

/**
 * Blue: fewer capitals but a strong destroyer screen.
 * Red: heavier capital line (two battleships, two battlecruisers) with thin screens.
 */
export const DEFAULT_SCENARIO: BattleSetup = {
  sides: [
    {
      name: 'Blue Fleet',
      aggressiveness: 'mediumRisk',
      ships: [
        ship('battleship', 'Colossus'),
        ship('battleship', 'Dominion'),
        ship('heavyCruiser', 'Warden'),
        ship('lightCruiser', 'Swift'),
        ship('lightCruiser', 'Arrow'),
        ship('destroyer', 'Hound'),
        ship('destroyer', 'Lance'),
        ship('destroyer', 'Rapier'),
        ship('destroyer', 'Sabre'),
        ship('destroyer', 'Talon'),
        ship('destroyer', 'Wasp'),
      ],
    },
    {
      name: 'Red Fleet',
      aggressiveness: 'mediumRisk',
      ships: [
        ship('battleship', 'Konig'),
        ship('battleship', 'Kaiser'),
        ship('battlecruiser', 'Blitz'),
        ship('battlecruiser', 'Donner'),
        ship('lightCruiser', 'Falke'),
        ship('lightCruiser', 'Adler'),
        ship('destroyer', 'Pfeil'),
        ship('destroyer', 'Speer'),
        ship('destroyer', 'Dolch'),
        ship('destroyer', 'Axt'),
      ],
    },
  ],
};

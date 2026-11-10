/** The default sandbox battle: preset designs in the default fleets. */
import { PRESET_DESIGNS } from '../data/designs';
import { DEFAULT_FLEETS, SHIP_NAMES } from '../data/scenarios';
import type { BattleSetup } from './battle/types';
import { buildBattleSetup, DEFAULT_CATALOG } from './designer';

export function defaultBattleSetup(): BattleSetup {
  return buildBattleSetup(DEFAULT_CATALOG, PRESET_DESIGNS, DEFAULT_FLEETS, SHIP_NAMES).setup;
}

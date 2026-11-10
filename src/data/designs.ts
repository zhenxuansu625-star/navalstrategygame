/** Preset designs: ready-made ships for the sandbox and starting points for the designer. */
import type { Design } from '../sim/designer/types';

const d = (id: string, name: string, role: string, hullId: string, slots: Record<string, string | null>): Design => ({
  id, name, role, hullId, slots,
});

export const PRESET_DESIGNS: Design[] = [
  d('preset_dd_1915', 'Destroyer 1915', 'Torpedo destroyer', 'dd2', {
    fireControl: 'fc_basic', engine: 'eng_light2', mainFront: 'lb2', mainRear: 'torp2', custom1: 'torp2',
  }),
  d('preset_cl_1915', 'Light cruiser 1915', 'Scout cruiser', 'cl2', {
    fireControl: 'fc_rangefinder', engine: 'eng_light2', armour: 'arm_lc2',
    mainFront: 'lb2', mainMid: 'lb2', mainRear: 'lb2', custom1: 'torp2', custom2: 'dc1',
  }),
  d('preset_ca_1915', 'Heavy cruiser 1915', 'Armoured cruiser', 'ca2', {
    fireControl: 'fc_rangefinder', engine: 'eng_cruiser2', armour: 'arm_ca2',
    mainFront: 'mb2', mainMid: 'lb2', mainRear: 'mb2', secondary1: 'sec1', custom1: 'torp2', custom2: null,
  }),
  d('preset_bc_1916', 'Battlecruiser 1916', 'Fast capital ship', 'bc2', {
    fireControl: 'fc_director', engine: 'eng_cruiser2', armour: 'arm_bb1',
    mainFront: 'hb2', mainMid: 'hb2', mainRear: 'hb2', secondary1: 'sec2', secondary2: 'sec2', custom1: null, custom2: null,
  }),
  d('preset_bb_1915', 'Battleship 1915', 'Battle line', 'bb2', {
    fireControl: 'fc_director', engine: 'eng_bb2', armour: 'arm_bb2',
    mainFront: 'hb3', mainMid: 'hb3', mainRear: 'hb3', secondary1: 'sec2', secondary2: 'sec2', custom1: null, custom2: null,
  }),
  d('preset_bb_1895', 'Pre-dreadnought 1895', 'Battle line', 'bb1', {
    fireControl: 'fc_basic', engine: 'eng_bb1', armour: 'arm_bb1',
    mainFront: 'hb1', mainMid: 'mb1', mainRear: 'hb1', secondary1: 'sec1', secondary2: 'sec1', custom1: 'torp1',
  }),
  d('preset_dd_1936', 'Destroyer 1936', 'Fleet destroyer', 'dd4', {
    fireControl: 'fc_director', engine: 'eng_light3', mainFront: 'lb4', mainRear: 'torp4', custom1: 'torp4', custom2: 'dc2',
  }),
  d('preset_cl_1936', 'Light cruiser 1936', 'Fleet cruiser', 'cl4', {
    fireControl: 'fc_director', engine: 'eng_light3', armour: 'arm_lc3',
    mainFront: 'lb4', mainMid: 'lb4', mainRear: 'lb4', custom1: 'torp4', custom2: 'aa2', custom3: 'sonar2',
  }),
  d('preset_ca_1936', 'Treaty cruiser 1936', 'Heavy cruiser', 'ca4', {
    fireControl: 'fc_director', engine: 'eng_cruiser3', armour: 'arm_ca3',
    mainFront: 'mb4', mainMid: 'mb4', mainRear: 'mb4', secondary1: 'dp1', secondary2: 'dp1',
    custom1: 'torp4', custom2: 'aa2', custom3: null,
  }),
  d('preset_bb_1936', 'Fast battleship 1936', 'Fast battleship', 'bb4', {
    fireControl: 'fc_director', engine: 'eng_bb3', armour: 'arm_bb4',
    mainFront: 'hb4', mainMid: 'hb4', mainRear: 'hb4', secondary1: 'dp2', secondary2: 'dp2', secondary3: 'dp2',
    custom1: 'aa2', custom2: 'aa2', custom3: 'radar1',
  }),
  d('preset_sh_1940', 'Super-heavy battleship 1940', 'Super-battleship', 'sh1', {
    fireControl: 'fc_radar', engine: 'eng_bb3', armour: 'arm_bb4',
    mainFront: 'shb1', mainMid: 'shb1', mainRear: 'shb1', secondary1: 'dp2', secondary2: 'dp2', secondary3: 'dp2',
    custom1: 'aa3', custom2: 'aa3', custom3: 'radar1',
  }),
];

export const ROLE_SUGGESTIONS = [
  'Torpedo destroyer', 'Fleet destroyer', 'Convoy escort', 'Scout cruiser', 'Fleet cruiser',
  'Armoured cruiser', 'Heavy cruiser', 'Fast capital ship', 'Battle line', 'Fast battleship', 'Super-battleship',
];

/**
 * Preset designs: ready-made ships for the sandbox, the campaign AI and as starting
 * points for the designer. One preset per hull class per era, named
 * "<era tier> <ship type>" (see eras.ts); the tier matches the design's tech year.
 */
import type { Design } from '../sim/designer/types';

const d = (id: string, name: string, role: string, hullId: string, slots: Record<string, string | null>): Design => ({
  id, name, role, hullId, slots,
});

export const PRESET_DESIGNS: Design[] = [
  // ---------------------------------------------------------------- Destroyers
  d('preset_dd_1895', 'Pre-dreadnought Destroyer', 'Torpedo destroyer', 'dd1', {
    fireControl: 'fc_basic', engine: 'eng_light1', mainFront: 'lb1', mainRear: 'torp1', custom1: 'torp1',
  }),
  d('preset_dd_1915', 'Early Destroyer', 'Torpedo destroyer', 'dd2', {
    fireControl: 'fc_basic', engine: 'eng_light2', mainFront: 'lb2', mainRear: 'torp2', custom1: 'torp2',
  }),
  d('preset_dd_1936', 'Basic Destroyer', 'Fleet destroyer', 'dd4', {
    fireControl: 'fc_director', engine: 'eng_light3', mainFront: 'lb4', mainRear: 'torp4', custom1: 'torp4', custom2: 'dc2',
  }),
  d('preset_dd_1938', 'Improved Destroyer', 'Fleet destroyer', 'dd4', {
    fireControl: 'fc_director', engine: 'eng_light3', mainFront: 'lb4', mainRear: 'torp4', custom1: 'radar1', custom2: 'dc2',
  }),
  d('preset_dd_1942', 'Advanced Destroyer', 'Convoy escort', 'dd4', {
    fireControl: 'fc_radar', engine: 'eng_light3', mainFront: 'lb4', mainRear: 'torp4', custom1: 'radar2', custom2: 'dc2',
  }),

  // ---------------------------------------------------------------- Light cruisers
  d('preset_cl_1895', 'Pre-dreadnought Light Cruiser', 'Scout cruiser', 'cl1', {
    fireControl: 'fc_basic', engine: 'eng_light1', armour: 'arm_lc1',
    mainFront: 'lb1', mainMid: 'lb1', mainRear: 'lb1', custom1: 'torp1',
  }),
  d('preset_cl_1915', 'Early Light Cruiser', 'Scout cruiser', 'cl2', {
    fireControl: 'fc_rangefinder', engine: 'eng_light2', armour: 'arm_lc2',
    mainFront: 'lb2', mainMid: 'lb2', mainRear: 'lb2', custom1: 'torp2', custom2: null,
  }),
  d('preset_cl_1936', 'Basic Light Cruiser', 'Fleet cruiser', 'cl4', {
    fireControl: 'fc_director', engine: 'eng_light3', armour: 'arm_lc3',
    mainFront: 'lb4', mainMid: 'lb4', mainRear: 'lb4', custom1: 'torp4', custom2: 'aa2', custom3: 'sonar2',
  }),
  d('preset_cl_1938', 'Improved Light Cruiser', 'Fleet cruiser', 'cl4', {
    fireControl: 'fc_director', engine: 'eng_light3', armour: 'arm_lc3',
    mainFront: 'lb4', mainMid: 'lb4', mainRear: 'lb4', custom1: 'torp4', custom2: 'aa2', custom3: 'radar1',
  }),
  d('preset_cl_1942', 'Advanced Light Cruiser', 'Anti-air cruiser', 'cl4', {
    fireControl: 'fc_radar', engine: 'eng_light3', armour: 'arm_lc3',
    mainFront: 'lb4', mainMid: 'lb4', mainRear: 'lb4', custom1: 'aa3', custom2: 'radar2', custom3: 'sonar2',
  }),

  // ---------------------------------------------------------------- Heavy cruisers
  d('preset_ca_1898', 'Pre-dreadnought Heavy Cruiser', 'Armoured cruiser', 'ca1', {
    fireControl: 'fc_basic', engine: 'eng_cruiser1', armour: 'arm_ca1',
    mainFront: 'mb1', mainMid: 'lb1', mainRear: 'mb1', secondary1: 'sec1', custom1: 'torp1',
  }),
  d('preset_ca_1915', 'Early Heavy Cruiser', 'Armoured cruiser', 'ca2', {
    fireControl: 'fc_rangefinder', engine: 'eng_cruiser2', armour: 'arm_ca2',
    mainFront: 'mb2', mainMid: 'lb2', mainRear: 'mb2', secondary1: 'sec1', custom1: 'torp2', custom2: null,
  }),
  d('preset_ca_1936', 'Basic Heavy Cruiser', 'Treaty cruiser', 'ca4', {
    fireControl: 'fc_director', engine: 'eng_cruiser3', armour: 'arm_ca3',
    mainFront: 'mb4', mainMid: 'mb4', mainRear: 'mb4', secondary1: 'dp1', secondary2: 'dp1',
    custom1: 'torp4', custom2: 'aa2', custom3: null,
  }),
  d('preset_ca_1938', 'Improved Heavy Cruiser', 'Heavy cruiser', 'ca4', {
    fireControl: 'fc_director', engine: 'eng_cruiser3', armour: 'arm_ca3',
    mainFront: 'mb4', mainMid: 'mb4', mainRear: 'mb4', secondary1: 'dp2', secondary2: 'dp2',
    custom1: 'torp4', custom2: 'aa2', custom3: 'radar1',
  }),
  d('preset_ca_1942', 'Advanced Heavy Cruiser', 'Heavy cruiser', 'ca4', {
    fireControl: 'fc_radar', engine: 'eng_cruiser3', armour: 'arm_ca3',
    mainFront: 'mb4', mainMid: 'mb4', mainRear: 'mb4', secondary1: 'dp2', secondary2: 'dp2',
    custom1: 'aa3', custom2: 'radar2', custom3: 'xarm',
  }),

  // ---------------------------------------------------------------- Battlecruisers
  d('preset_bc_1908', 'Early Battlecruiser', 'Fast capital ship', 'bc1', {
    fireControl: 'fc_rangefinder', engine: 'eng_cruiser1', armour: 'arm_ca1',
    mainFront: 'hb2', mainMid: 'hb2', mainRear: 'hb2', secondary1: 'sec1', custom1: null,
  }),
  d('preset_bc_1930', 'Basic Battlecruiser', 'Fast capital ship', 'bc3', {
    fireControl: 'fc_director', engine: 'eng_cruiser3', armour: 'arm_bb3',
    mainFront: 'hb3', mainMid: 'hb3', mainRear: 'hb3', secondary1: 'sec3', secondary2: 'sec3',
    custom1: 'aa1', custom2: null, custom3: null,
  }),

  // ---------------------------------------------------------------- Battleships
  d('preset_bb_1895', 'Pre-dreadnought Battleship', 'Battle line', 'bb1', {
    fireControl: 'fc_basic', engine: 'eng_bb1', armour: 'arm_bb1',
    mainFront: 'hb1', mainMid: 'mb1', mainRear: 'hb1', secondary1: 'sec1', secondary2: 'sec1', custom1: 'torp1',
  }),
  d('preset_bb_1906', 'Early Battleship', 'All-big-gun battleship', 'bb2', {
    fireControl: 'fc_rangefinder', engine: 'eng_bb1', armour: 'arm_bb2',
    mainFront: 'hb2', mainMid: 'hb2', mainRear: 'hb2', secondary1: 'sec1', secondary2: 'sec1', custom1: null, custom2: null,
  }),
  d('preset_bb_1925', 'Basic Battleship', 'Battle line', 'bb3', {
    fireControl: 'fc_director', engine: 'eng_bb2', armour: 'arm_bb3',
    mainFront: 'hb3', mainMid: 'hb3', mainRear: 'hb3', secondary1: 'sec3', secondary2: 'sec3', secondary3: 'sec3',
    custom1: 'aa1', custom2: null,
  }),
  d('preset_bb_1936', 'Improved Battleship', 'Fast battleship', 'bb4', {
    fireControl: 'fc_director', engine: 'eng_bb3', armour: 'arm_bb4',
    mainFront: 'hb4', mainMid: 'hb4', mainRear: 'hb4', secondary1: 'dp2', secondary2: 'dp2', secondary3: 'dp2',
    custom1: 'aa2', custom2: 'aa2', custom3: 'radar1',
  }),
  d('preset_bb_1942', 'Advanced Battleship', 'Fast battleship', 'bb4', {
    fireControl: 'fc_radar', engine: 'eng_bb3', armour: 'arm_bb4',
    mainFront: 'hb4', mainMid: 'hb4', mainRear: 'hb4', secondary1: 'dp2', secondary2: 'dp2', secondary3: 'dp2',
    custom1: 'aa3', custom2: 'aa3', custom3: 'radar2',
  }),
  d('preset_sh_1940', 'Improved Super-heavy Battleship', 'Super-battleship', 'sh1', {
    fireControl: 'fc_radar', engine: 'eng_bb3', armour: 'arm_bb4',
    mainFront: 'shb1', mainMid: 'shb1', mainRear: 'shb1', secondary1: 'dp2', secondary2: 'dp2', secondary3: 'dp2',
    custom1: 'aa3', custom2: 'aa3', custom3: 'radar1',
  }),

  // ---------------------------------------------------------------- Carriers
  d('preset_cv_1924', 'Basic Carrier', 'Fleet carrier', 'cv1', {
    fireControl: 'fc_rangefinder', engine: 'eng_cruiser2', armour: 'arm_cv1',
    hangar1: 'hangar1', hangar2: 'hangar1', secondary1: 'sec2', secondary2: 'sec2', custom1: null, custom2: null,
  }),
  d('preset_cv_1942', 'Improved Carrier', 'Fleet carrier', 'cv3', {
    fireControl: 'fc_radar', engine: 'eng_cruiser3', armour: 'arm_cv2',
    hangar1: 'hangar3', hangar2: 'hangar3', hangar3: 'hangar3', hangar4: 'hangar3',
    secondary1: 'dp2', secondary2: 'dp2', secondary3: 'dp2', custom1: 'aa3', custom2: 'aa3', custom3: 'radar1',
  }),
  d('preset_cv_1944', 'Advanced Carrier', 'Fleet carrier', 'cv3', {
    fireControl: 'fc_radar', engine: 'eng_cruiser3', armour: 'arm_cv3',
    hangar1: 'hangar3', hangar2: 'hangar3', hangar3: 'hangar3', hangar4: 'hangar3',
    secondary1: 'dp2', secondary2: 'dp2', secondary3: 'dp2', custom1: 'aa3', custom2: 'aa3', custom3: 'radar2',
  }),

  // ---------------------------------------------------------------- Submarines
  d('preset_ss_1905', 'Pre-dreadnought Submarine', 'Coastal submarine', 'sub1', {
    engine: 'eng_sub1', mainFront: 'torp1', mainRear: null, secondary1: null, custom1: null,
  }),
  d('preset_ss_1915', 'Early Submarine', 'Patrol submarine', 'sub2', {
    engine: 'eng_sub1', mainFront: 'torp2', mainRear: 'torp2', secondary1: 'sec1', custom1: null,
  }),
  d('preset_ss_1925', 'Basic Submarine', 'Patrol submarine', 'sub3', {
    engine: 'eng_sub2', mainFront: 'torp3', mainRear: 'torp3', secondary1: 'sec2', custom1: 'sub_reload', custom2: null,
  }),
  d('preset_ss_1938', 'Improved Submarine', 'Fleet submarine', 'sub4', {
    engine: 'eng_sub3', mainFront: 'torp4', mainRear: 'torp4', secondary1: 'sec2', custom1: 'sub_reload', custom2: 'snorkel',
  }),
  d('preset_ss_1942', 'Advanced Submarine', 'Fleet submarine', 'sub5', {
    engine: 'eng_sub3', mainFront: 'torp4', mainRear: 'torp4', secondary1: null,
    custom1: 'snorkel', custom2: 'anechoic', custom3: 'sub_reload',
  }),
];

/**
 * Presets replaced when the line-up moved to one design per era. Saved sandbox
 * fleets that still use these ids are pointed at the replacement.
 */
export const RETIRED_PRESETS: Readonly<Record<string, string>> = {
  preset_bb_1914: 'preset_bb_1906',
  preset_bb_1915: 'preset_bb_1906',
  preset_bc_1916: 'preset_bc_1908',
  preset_cv_1940: 'preset_cv_1924',
};

export const ROLE_SUGGESTIONS = [
  'Torpedo destroyer', 'Fleet destroyer', 'Convoy escort', 'Scout cruiser', 'Fleet cruiser', 'Anti-air cruiser',
  'Armoured cruiser', 'Treaty cruiser', 'Heavy cruiser', 'Fast capital ship', 'Battle line', 'All-big-gun battleship',
  'Fast battleship', 'Super-battleship', 'Fleet carrier', 'Escort carrier', 'Coastal submarine', 'Patrol submarine',
  'Fleet submarine',
];

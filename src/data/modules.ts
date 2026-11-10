/** Module catalogue. Each module adds stats and cost to the design it is fitted to. */
import type { Cost, HullClass, Module, ModuleCategory, ModuleStats } from '../sim/designer/types';

type Row = [id: string, name: string, year: number, stats: Partial<ModuleStats>, production: number, steel: number, chromium: number, hullClasses?: HullClass[]];

function cat(category: ModuleCategory, rows: Row[]): Module[] {
  return rows.map(([id, name, year, stats, production, steel, chromium, hullClasses]) => {
    const cost: Cost = { production, steel, chromium };
    return hullClasses ? { id, name, category, year, stats, cost, hullClasses } : { id, name, category, year, stats, cost };
  });
}

const LIGHT_SHIPS: HullClass[] = ['destroyer', 'lightCruiser'];
const CRUISERS: HullClass[] = ['heavyCruiser', 'battlecruiser'];
/** Cruiser machinery also drives carriers. */
const CRUISER_ENGINES: HullClass[] = [...CRUISERS, 'carrier'];
const BATTLESHIPS: HullClass[] = ['battleship', 'superHeavy'];

export const MODULES: Module[] = [
  ...cat('fireControl', [
    ['fc_basic', 'Basic fire control', 1890, { fireControl: 0 }, 50, 0, 0],
    ['fc_rangefinder', 'Improved rangefinders', 1906, { fireControl: 0.02 }, 120, 0, 0],
    ['fc_director', 'Director firing', 1914, { fireControl: 0.04 }, 200, 0, 0],
    ['fc_radar', 'Radar ranging', 1940, { fireControl: 0.07, surfaceDetection: 4 }, 400, 0, 2],
  ]),
  ...cat('engine', [
    ['eng_light1', 'Light ship engine I', 1890, { speed: 2 }, 100, 0, 0, LIGHT_SHIPS],
    ['eng_light2', 'Light ship engine II', 1910, { speed: 4 }, 180, 0, 0, LIGHT_SHIPS],
    ['eng_light3', 'Light ship engine III', 1930, { speed: 6 }, 260, 0, 1, LIGHT_SHIPS],
    ['eng_cruiser1', 'Cruiser engine I', 1890, { speed: 3 }, 300, 1, 0, CRUISER_ENGINES],
    ['eng_cruiser2', 'Cruiser engine II', 1910, { speed: 5 }, 450, 1, 0, CRUISER_ENGINES],
    ['eng_cruiser3', 'Cruiser engine III', 1930, { speed: 7 }, 600, 1, 1, CRUISER_ENGINES],
    ['eng_bb1', 'Battleship engine I', 1890, { speed: 3 }, 500, 2, 0, BATTLESHIPS],
    ['eng_bb2', 'Battleship engine II', 1910, { speed: 5 }, 750, 2, 0, BATTLESHIPS],
    ['eng_bb3', 'Battleship engine III', 1930, { speed: 8 }, 1000, 2, 2, BATTLESHIPS],
  ]),
  ...cat('armour', [
    ['arm_lc1', 'Light cruiser belt I', 1890, { armour: 3, hp: 5, speed: -1 }, 150, 1, 0, ['lightCruiser']],
    ['arm_lc2', 'Light cruiser belt II', 1910, { armour: 4, hp: 10, speed: -1 }, 250, 1, 0, ['lightCruiser']],
    ['arm_lc3', 'Light cruiser belt III', 1930, { armour: 6, hp: 15, speed: -1 }, 350, 2, 0, ['lightCruiser']],
    ['arm_ca1', 'Cruiser belt I', 1890, { armour: 6, hp: 15, speed: -1 }, 400, 2, 0, CRUISERS],
    ['arm_ca2', 'Cruiser belt II', 1910, { armour: 8, hp: 20, speed: -1 }, 600, 3, 0, CRUISERS],
    ['arm_ca3', 'Cruiser belt III', 1930, { armour: 11, hp: 25, speed: -1 }, 800, 3, 1, CRUISERS],
    ['arm_bb1', 'Battleship belt and deck I (Harvey)', 1890, { armour: 14, hp: 40, speed: -2 }, 900, 5, 0, ['battlecruiser', ...BATTLESHIPS]],
    ['arm_bb2', 'Battleship belt and deck II (Krupp)', 1906, { armour: 20, hp: 50, speed: -2 }, 1300, 6, 0, ['battlecruiser', ...BATTLESHIPS]],
    ['arm_bb3', 'Battleship belt and deck III', 1916, { armour: 24, hp: 60, speed: -2 }, 1700, 7, 1, ['battlecruiser', ...BATTLESHIPS]],
    ['arm_bb4', 'Battleship belt and deck IV (all-or-nothing)', 1936, { armour: 30, hp: 70, speed: -2 }, 2200, 8, 2, BATTLESHIPS],
    ['arm_cv1', 'Carrier deck armour I', 1922, { armour: 6, hp: 20, speed: -1 }, 500, 3, 0, ['carrier']],
    ['arm_cv2', 'Carrier deck armour II', 1936, { armour: 10, hp: 30, speed: -1 }, 700, 4, 0, ['carrier']],
    ['arm_cv3', 'Armoured flight deck', 1940, { armour: 16, hp: 40, speed: -2 }, 1000, 6, 1, ['carrier']],
  ]),
  ...cat('lightBattery', [
    ['lb1', 'Light battery I', 1890, { lightAttack: 3, lightPiercing: 4 }, 60, 1, 0],
    ['lb2', 'Light battery II', 1906, { lightAttack: 4, lightPiercing: 5 }, 90, 1, 0],
    ['lb3', 'Light battery III', 1922, { lightAttack: 5, lightPiercing: 6 }, 120, 1, 0],
    ['lb4', 'Light battery IV', 1936, { lightAttack: 6, lightPiercing: 7 }, 150, 1, 0],
  ]),
  ...cat('mediumBattery', [
    ['mb1', 'Medium battery I', 1890, { heavyAttack: 6, heavyPiercing: 12, visibility: 1 }, 200, 2, 0],
    ['mb2', 'Medium battery II', 1910, { heavyAttack: 7, heavyPiercing: 16, visibility: 1 }, 260, 2, 0],
    ['mb3', 'Medium battery III', 1925, { heavyAttack: 8, heavyPiercing: 20, visibility: 1 }, 320, 2, 0],
    ['mb4', 'Medium battery IV', 1936, { heavyAttack: 9, heavyPiercing: 22, visibility: 1 }, 380, 2, 0],
  ]),
  ...cat('heavyBattery', [
    ['hb1', 'Heavy battery I (12-inch)', 1890, { heavyAttack: 10, heavyPiercing: 24, visibility: 2 }, 500, 4, 0],
    ['hb2', 'Heavy battery II (12-inch)', 1906, { heavyAttack: 11, heavyPiercing: 28, visibility: 2 }, 600, 4, 0],
    ['hb3', 'Heavy battery III (15-inch)', 1914, { heavyAttack: 13, heavyPiercing: 32, visibility: 2 }, 800, 6, 0],
    ['hb4', 'Heavy battery IV (16-inch)', 1936, { heavyAttack: 15, heavyPiercing: 40, visibility: 2 }, 1000, 6, 1],
  ]),
  ...cat('superHeavyBattery', [
    ['shb1', 'Super-heavy battery (18-inch)', 1940, { heavyAttack: 20, heavyPiercing: 46, visibility: 3, speed: -1 }, 1600, 10, 2, ['superHeavy']],
  ]),
  ...cat('secondary', [
    ['sec1', 'Secondary battery I', 1890, { lightAttack: 2, lightPiercing: 4 }, 80, 1, 0],
    ['sec2', 'Secondary battery II', 1910, { lightAttack: 3, lightPiercing: 5 }, 110, 1, 0],
    ['sec3', 'Secondary battery III', 1925, { lightAttack: 4, lightPiercing: 6 }, 140, 1, 0],
  ]),
  ...cat('dualPurpose', [
    ['dp1', 'Dual-purpose battery I', 1930, { lightAttack: 2, lightPiercing: 5, aa: 3 }, 160, 1, 0],
    ['dp2', 'Dual-purpose battery II', 1938, { lightAttack: 3, lightPiercing: 6, aa: 5 }, 200, 1, 0],
  ]),
  ...cat('torpedo', [
    ['torp1', 'Torpedo launcher I', 1890, { torpedoAttack: 10, torpedoPiercing: 30 }, 80, 1, 0],
    ['torp2', 'Torpedo launcher II', 1906, { torpedoAttack: 13, torpedoPiercing: 40 }, 110, 1, 0],
    ['torp3', 'Torpedo launcher III', 1922, { torpedoAttack: 16, torpedoPiercing: 50 }, 140, 1, 0],
    ['torp4', 'Torpedo launcher IV', 1936, { torpedoAttack: 20, torpedoPiercing: 60 }, 180, 1, 0],
  ]),
  ...cat('aa', [
    ['aa1', 'AA guns I', 1925, { aa: 2 }, 60, 0, 0],
    ['aa2', 'AA guns II', 1935, { aa: 4 }, 100, 0, 0],
    ['aa3', 'AA guns III', 1940, { aa: 6 }, 140, 0, 1],
  ]),
  ...cat('asw', [
    ['dc1', 'Depth charges I', 1915, { subDetection: 1 }, 50, 0, 0],
    ['dc2', 'Depth charges II', 1935, { subDetection: 2 }, 90, 0, 0],
  ]),
  ...cat('sensor', [
    ['sonar1', 'Sonar I', 1918, { subDetection: 4 }, 120, 0, 0],
    ['sonar2', 'Sonar II', 1936, { subDetection: 8 }, 200, 0, 0],
    ['radar1', 'Radar I', 1938, { surfaceDetection: 6 }, 250, 0, 1],
    ['radar2', 'Radar II', 1942, { surfaceDetection: 12 }, 400, 0, 2],
  ]),
  ...cat('hangar', [
    ['hangar1', 'Hangar I', 1922, { airWing: 12, visibility: 1 }, 600, 2, 0, ['carrier']],
    ['hangar2', 'Hangar II', 1932, { airWing: 16, visibility: 1 }, 800, 2, 0, ['carrier']],
    ['hangar3', 'Hangar III', 1940, { airWing: 20, visibility: 1 }, 1000, 2, 1, ['carrier']],
  ]),
  ...cat('extraArmour', [
    ['xarm', 'Extra armour plating', 1890, { armour: 2, hp: 10, speed: -1 }, 200, 2, 0],
  ]),
];

export const MODULE_CATEGORY_NAMES: Record<ModuleCategory, string> = {
  fireControl: 'Fire control',
  engine: 'Engine',
  armour: 'Armour',
  lightBattery: 'Light battery',
  mediumBattery: 'Medium battery',
  heavyBattery: 'Heavy battery',
  superHeavyBattery: 'Super-heavy battery',
  secondary: 'Secondary battery',
  dualPurpose: 'Dual-purpose battery',
  torpedo: 'Torpedoes',
  aa: 'Anti-air',
  asw: 'Anti-submarine',
  sensor: 'Sensors',
  extraArmour: 'Extra armour',
  hangar: 'Hangar',
};

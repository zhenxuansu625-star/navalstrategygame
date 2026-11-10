/** Hull catalogue. Newer hulls have more slots, more HP and better base stats. */
import type { Hull, HullClass, ModuleCategory, SlotDef } from '../sim/designer/types';

const CUSTOM_LIGHT: ModuleCategory[] = ['torpedo', 'aa', 'asw', 'sensor'];
const CUSTOM: ModuleCategory[] = ['torpedo', 'aa', 'asw', 'sensor', 'extraArmour'];
const SECONDARY: ModuleCategory[] = ['secondary', 'dualPurpose'];

function slots(opts: {
  armour: boolean;
  front: ModuleCategory[];
  mid?: ModuleCategory[];
  rear?: ModuleCategory[];
  secondary?: number;
  custom: number;
  customAccepts?: ModuleCategory[];
}): SlotDef[] {
  const out: SlotDef[] = [
    { id: 'fireControl', label: 'Fire control', group: 'fixed', accepts: ['fireControl'], required: true },
    { id: 'engine', label: 'Engine', group: 'fixed', accepts: ['engine'], required: true },
  ];
  if (opts.armour) out.push({ id: 'armour', label: 'Armour', group: 'fixed', accepts: ['armour'], required: true });
  out.push({ id: 'mainFront', label: 'Main (front)', group: 'main', accepts: opts.front, required: true });
  if (opts.mid) out.push({ id: 'mainMid', label: 'Main (mid)', group: 'main', accepts: opts.mid, required: false });
  if (opts.rear) out.push({ id: 'mainRear', label: 'Main (rear)', group: 'main', accepts: opts.rear, required: false });
  for (let i = 1; i <= (opts.secondary ?? 0); i++) {
    out.push({ id: `secondary${i}`, label: `Secondary ${i}`, group: 'secondary', accepts: SECONDARY, required: false });
  }
  for (let i = 1; i <= opts.custom; i++) {
    out.push({ id: `custom${i}`, label: `Custom ${i}`, group: 'custom', accepts: opts.customAccepts ?? CUSTOM, required: false });
  }
  return out;
}

type HullRow = [id: string, name: string, year: number, hp: number, armour: number, visibility: number, speed: number, production: number, steel: number, chromium: number, slots: SlotDef[]];

function hulls(hullClass: HullClass, line: Hull['line'], org: number, rows: HullRow[]): Hull[] {
  return rows.map(([id, name, year, hp, armour, visibility, speed, production, steel, chromium, s]) => ({
    id, name, hullClass, line, year, hp, org, armour, visibility, speed,
    cost: { production, steel, chromium },
    slots: s,
  }));
}

const L: ModuleCategory[] = ['lightBattery'];
const M: ModuleCategory[] = ['mediumBattery'];
const H: ModuleCategory[] = ['heavyBattery'];

const dd = (custom: number) => slots({ armour: false, front: L, rear: ['lightBattery', 'torpedo'], custom, customAccepts: CUSTOM_LIGHT });
const cl = (custom: number) => slots({ armour: true, front: L, mid: L, rear: L, custom });
const ca = (secondary: number, custom: number) => slots({ armour: true, front: M, mid: ['mediumBattery', 'lightBattery'], rear: M, secondary, custom });
const capital = (secondary: number, custom: number, mid: ModuleCategory[] = H, main: ModuleCategory[] = H) =>
  slots({ armour: true, front: main, mid, rear: main, secondary, custom });

export const HULLS: Hull[] = [
  //                 id      name                year  hp   arm vis  spd  prod  steel chrom slots
  ...hulls('destroyer', 'screen', 40, [
    ['dd1', 'Destroyer I', 1890, 30, 1, 5, 27, 500, 1, 0, dd(1)],
    ['dd2', 'Destroyer II', 1906, 35, 2, 6, 30, 600, 1, 0, dd(1)],
    ['dd3', 'Destroyer III', 1922, 40, 2, 6, 32, 700, 2, 0, dd(2)],
    ['dd4', 'Destroyer IV', 1936, 45, 3, 7, 33, 800, 2, 0, dd(2)],
  ]),
  ...hulls('lightCruiser', 'screen', 40, [
    ['cl1', 'Light Cruiser I', 1890, 55, 2, 10, 24, 1200, 2, 0, cl(1)],
    ['cl2', 'Light Cruiser II', 1906, 65, 2, 11, 26, 1400, 3, 0, cl(2)],
    ['cl3', 'Light Cruiser III', 1922, 75, 3, 12, 28, 1600, 3, 0, cl(2)],
    ['cl4', 'Light Cruiser IV', 1936, 85, 3, 12, 29, 1800, 4, 0, cl(3)],
  ]),
  ...hulls('heavyCruiser', 'capital', 40, [
    ['ca1', 'Heavy Cruiser I', 1890, 100, 4, 17, 22, 2600, 4, 0, ca(1, 1)],
    ['ca2', 'Heavy Cruiser II', 1906, 115, 4, 18, 24, 2900, 5, 0, ca(1, 2)],
    ['ca3', 'Heavy Cruiser III', 1922, 130, 5, 19, 26, 3200, 5, 0, ca(2, 2)],
    ['ca4', 'Heavy Cruiser IV', 1936, 145, 5, 20, 27, 3500, 6, 0, ca(2, 3)],
  ]),
  ...hulls('battlecruiser', 'capital', 40, [
    ['bc1', 'Battlecruiser I', 1906, 160, 6, 28, 23, 5000, 8, 0, capital(1, 1)],
    ['bc2', 'Battlecruiser II', 1916, 180, 6, 29, 24, 5600, 9, 0, capital(2, 2)],
    ['bc3', 'Battlecruiser III', 1930, 200, 7, 30, 26, 6200, 10, 0, capital(2, 3)],
  ]),
  ...hulls('battleship', 'capital', 40, [
    ['bb1', 'Battleship I (pre-dreadnought)', 1890, 180, 8, 28, 13, 5500, 10, 0, capital(2, 1, ['mediumBattery', 'lightBattery'])],
    ['bb2', 'Battleship II (dreadnought)', 1906, 220, 8, 30, 16, 6500, 12, 0, capital(2, 2)],
    ['bb3', 'Battleship III', 1922, 250, 9, 32, 18, 7500, 14, 0, capital(3, 2)],
    ['bb4', 'Battleship IV', 1936, 280, 10, 33, 21, 8500, 16, 0, capital(3, 3)],
  ]),
  ...hulls('superHeavy', 'capital', 40, [
    ['sh1', 'Super-heavy Battleship', 1940, 340, 12, 38, 19, 11000, 20, 2, capital(3, 3, ['heavyBattery', 'superHeavyBattery'], ['heavyBattery', 'superHeavyBattery'])],
  ]),
];

export const HULL_CLASS_NAMES: Record<HullClass, string> = {
  destroyer: 'Destroyer',
  lightCruiser: 'Light cruiser',
  heavyCruiser: 'Heavy cruiser',
  battlecruiser: 'Battlecruiser',
  battleship: 'Battleship',
  superHeavy: 'Super-heavy battleship',
};

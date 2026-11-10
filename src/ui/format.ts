import type { DesignStats, Module, NumericStatKey } from '../sim/designer';

export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function formatModuleStats(m: Module): string {
  const s = m.stats;
  const parts: string[] = [];
  if (s.lightAttack) parts.push(`light ${s.lightAttack}/${s.lightPiercing ?? 0}`);
  if (s.heavyAttack) parts.push(`heavy ${s.heavyAttack}/${s.heavyPiercing ?? 0}`);
  if (s.torpedoAttack) parts.push(`torp ${s.torpedoAttack}/${s.torpedoPiercing ?? 0}`);
  if (s.armour) parts.push(`armour +${s.armour}`);
  if (s.hp) parts.push(`HP +${s.hp}`);
  if (s.fireControl) parts.push(`hit +${pct(s.fireControl)}`);
  if (s.speed) parts.push(`${s.speed > 0 ? '+' : ''}${s.speed} kn`);
  if (s.aa) parts.push(`AA +${s.aa}`);
  if (s.surfaceDetection) parts.push(`detect +${s.surfaceDetection}`);
  if (s.subDetection) parts.push(`sub detect +${s.subDetection}`);
  return parts.join(', ');
}

export type StatGroup = 'combat' | 'defence' | 'mobility';

export interface StatRow {
  key: NumericStatKey;
  group: StatGroup;
  label: string;
  /** 1 if higher is better, -1 if lower is better, 0 if neutral. */
  better: 1 | -1 | 0;
  format?: (v: number) => string;
  /** Shown but not used in battle yet. */
  inactive?: boolean;
}

export const STAT_ROWS: StatRow[] = [
  { key: 'hp', group: 'defence', label: 'HP', better: 1 },
  { key: 'org', group: 'defence', label: 'Organisation', better: 1 },
  { key: 'armour', group: 'defence', label: 'Armour', better: 1 },
  { key: 'lightAttack', group: 'combat', label: 'Light attack', better: 1 },
  { key: 'lightPiercing', group: 'combat', label: 'Light piercing', better: 1 },
  { key: 'heavyAttack', group: 'combat', label: 'Heavy attack', better: 1 },
  { key: 'heavyPiercing', group: 'combat', label: 'Heavy piercing', better: 1 },
  { key: 'torpedoAttack', group: 'combat', label: 'Torpedo attack', better: 1 },
  { key: 'torpedoPiercing', group: 'combat', label: 'Torpedo piercing', better: 1 },
  { key: 'fireControl', group: 'combat', label: 'Fire control (hit)', better: 1, format: (v) => `+${pct(v)}` },
  { key: 'speed', group: 'mobility', label: 'Speed (kn)', better: 1 },
  { key: 'visibility', group: 'mobility', label: 'Visibility', better: -1 },
  { key: 'aa', group: 'mobility', label: 'AA', better: 1, inactive: true },
  { key: 'surfaceDetection', group: 'mobility', label: 'Surface detection', better: 1, inactive: true },
  { key: 'subDetection', group: 'mobility', label: 'Sub detection', better: 1, inactive: true },
];

export function statValue(stats: DesignStats, row: StatRow): string {
  const v = stats[row.key];
  return row.format ? row.format(v) : String(Math.round(v * 10) / 10);
}

export const STAT_GROUP_TITLES: Record<StatGroup, string> = {
  combat: 'Combat',
  defence: 'Defence',
  mobility: 'Mobility and detection',
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
export const roman = (n: number) => ROMAN[n] ?? String(n);

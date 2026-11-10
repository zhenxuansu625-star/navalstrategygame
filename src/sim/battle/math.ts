/**
 * Pure combat formulas. Each takes the config explicitly so tests can pin
 * exact numbers independent of current balance values.
 */
import type { BattleConfig } from '../../data/battle';
import type { AttackType, ShipStats } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Chance that one attack of `attackType` from `attacker` hits `target`. */
export function hitChance(cfg: BattleConfig, attackType: AttackType, attacker: ShipStats, target: ShipStats): number {
  const h = cfg.hit;
  let p = h.base[attackType];
  if (h.fireControlApplies[attackType]) p += attacker.fireControl;
  p += h.visibilityPerPoint * (target.visibility - h.referenceVisibility);
  p -= h.speedPerKnot * (target.speed - h.referenceSpeed);
  if (attackType === 'heavy' && target.line === 'screen') p -= h.heavyVsScreenPenalty;
  return clamp(p, h.min, h.max);
}

export function pierces(piercing: number, armour: number): boolean {
  return piercing >= armour;
}

/** Damage multiplier from piercing vs armour: full if it pierces, heavily reduced otherwise. */
export function pierceMultiplier(cfg: BattleConfig, piercing: number, armour: number): number {
  return pierces(piercing, armour) ? 1 : cfg.damage.underPierceMultiplier;
}

/** Map a uniform roll in [0, 1) to the damage variance factor. */
export function damageVariance(cfg: BattleConfig, roll: number): number {
  const v = cfg.damage.variance;
  return 1 - v + 2 * v * roll;
}

export interface HitDamage {
  hp: number;
  org: number;
  pierced: boolean;
}

/** HP and organisation damage of one hit. */
export function hitDamage(
  cfg: BattleConfig,
  attack: number,
  piercing: number,
  target: ShipStats,
  varianceRoll: number,
): HitDamage {
  const raw = attack * damageVariance(cfg, varianceRoll);
  const pierced = pierces(piercing, target.armour);
  const hp = raw * pierceMultiplier(cfg, piercing, target.armour);
  const orgMult = pierced ? cfg.organisation.damageMultiplier : cfg.organisation.underPierceMultiplier;
  const org = (raw / target.hp) * target.org * orgMult;
  return { hp, org, pierced };
}

/**
 * Screening ratio in [0, 1]: active screens relative to the number needed to
 * fully screen the capitals. A fleet with no capitals counts as fully screened.
 */
export function screeningRatio(cfg: BattleConfig, screens: number, capitals: number): number {
  if (capitals <= 0) return 1;
  return clamp(screens / (capitals * cfg.screening.screensPerCapital), 0, 1);
}

/** Chance that an attack aimed at a capital actually reaches it rather than being intercepted by a screen. */
export function capitalReachChance(cfg: BattleConfig, attackType: AttackType, screens: number, capitals: number): number {
  if (screens <= 0) return 1;
  return 1 - cfg.screening.protection[attackType] * screeningRatio(cfg, screens, capitals);
}

/** Why a ship should retreat at this threshold, or null if it keeps fighting. */
export function retreatReason(
  threshold: number,
  hp: number,
  maxHp: number,
  org: number,
  maxOrg: number,
): 'hp' | 'org' | null {
  if (hp / maxHp < threshold) return 'hp';
  if (org / maxOrg < threshold) return 'org';
  return null;
}

/** Hourly chance a retreating ship disengages, based on its speed against the fastest enemy still fighting. */
export function escapeChance(cfg: BattleConfig, speed: number, fastestEnemySpeed: number | null): number {
  if (fastestEnemySpeed === null) return 1;
  const e = cfg.escape;
  return clamp(e.base + e.perKnot * (speed - fastestEnemySpeed), e.min, e.max);
}

export function attackOf(stats: ShipStats, type: AttackType): { attack: number; piercing: number } {
  switch (type) {
    case 'light':
      return { attack: stats.lightAttack, piercing: stats.lightPiercing };
    case 'heavy':
      return { attack: stats.heavyAttack, piercing: stats.heavyPiercing };
    case 'torpedo':
      return { attack: stats.torpedoAttack, piercing: stats.torpedoPiercing };
  }
}

/* ------------------------------------------------------------------ */
/* Carriers and air strikes                                            */
/* ------------------------------------------------------------------ */

/** Capital ships relative to the number needed to cover the carriers, in [0, 1]. No carriers counts as fully covered. */
export function carrierCoverRatio(cfg: BattleConfig, capitals: number, carriers: number): number {
  if (carriers <= 0) return 1;
  return clamp(capitals / (carriers * cfg.screening.capitalsPerCarrier), 0, 1);
}

/** Chance a shot aimed at a carrier reaches it rather than being drawn off by a capital ship. */
export function carrierReachChance(cfg: BattleConfig, attackType: AttackType, capitals: number, carriers: number): number {
  if (capitals <= 0) return 1;
  return 1 - cfg.screening.carrierProtection[attackType] * carrierCoverRatio(cfg, capitals, carriers);
}

/** Carriers launch on hours 1, 1 + interval, 1 + 2 * interval, ... */
export function isAirWaveHour(cfg: BattleConfig, hour: number): boolean {
  return hour >= 1 && (hour - 1) % cfg.air.waveInterval === 0;
}

/** AA defending a target: its own AA plus a share of the rest of its fleet's. */
export function effectiveAa(cfg: BattleConfig, targetAa: number, fleetAa: number): number {
  return targetAa + cfg.air.fleetAaShare * Math.max(0, fleetAa - targetAa);
}

/** Damage multiplier from AA: 1 with no AA, 0.5 at `aaHalfDamage`. */
export function aaDamageMultiplier(cfg: BattleConfig, effAa: number): number {
  return cfg.air.aaHalfDamage / (cfg.air.aaHalfDamage + Math.max(0, effAa));
}

/** Planes of a wave shot down by AA (rounded to whole planes). */
export function planesShotDown(cfg: BattleConfig, planes: number, effAa: number): number {
  const fraction = clamp(cfg.air.lossBase + cfg.air.lossPerAa * Math.max(0, effAa), 0, cfg.air.lossMax);
  return Math.min(planes, Math.round(planes * fraction));
}

export interface AirStrike extends HitDamage {
  shotDown: number;
  /** Planes that reached the target. */
  attackers: number;
}

/** One carrier's wave against one target: losses first, then the survivors' damage reduced by AA. */
export function airStrike(
  cfg: BattleConfig,
  planes: number,
  target: ShipStats,
  fleetAa: number,
  varianceRoll: number,
): AirStrike {
  const effAa = effectiveAa(cfg, target.aa, fleetAa);
  const shotDown = planesShotDown(cfg, planes, effAa);
  const attackers = planes - shotDown;
  const attack = attackers * cfg.air.attackPerPlane * aaDamageMultiplier(cfg, effAa);
  return { ...hitDamage(cfg, attack, cfg.air.piercing, target, varianceRoll), shotDown, attackers };
}

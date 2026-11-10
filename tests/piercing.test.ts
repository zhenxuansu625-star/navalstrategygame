import { describe, expect, it } from 'vitest';
import { damageVariance, hitDamage, pierceMultiplier, pierces } from '../src/sim/battle/math';
import { stats, TEST_CONFIG as cfg } from './helpers';

describe('piercing vs armour', () => {
  it('pierces when piercing is at or above armour', () => {
    expect(pierces(30, 30)).toBe(true);
    expect(pierces(31, 30)).toBe(true);
    expect(pierces(29, 30)).toBe(false);
  });

  it('gives full damage when piercing, heavily reduced otherwise', () => {
    expect(pierceMultiplier(cfg, 30, 30)).toBe(1);
    expect(pierceMultiplier(cfg, 50, 10)).toBe(1);
    expect(pierceMultiplier(cfg, 29, 30)).toBe(0.1);
    expect(pierceMultiplier(cfg, 0, 1)).toBe(0.1);
  });

  it('maps the variance roll to [1 - v, 1 + v]', () => {
    expect(damageVariance(cfg, 0)).toBeCloseTo(0.75);
    expect(damageVariance(cfg, 0.5)).toBeCloseTo(1);
    expect(damageVariance(cfg, 0.999999)).toBeCloseTo(1.25);
  });

  it('a piercing hit deals full HP damage and proportional org damage', () => {
    const target = stats({ hp: 100, org: 50, armour: 10 });
    const d = hitDamage(cfg, 20, 15, target, 0.5);
    expect(d.pierced).toBe(true);
    expect(d.hp).toBeCloseTo(20);
    // 20/100 of HP -> 20% of 50 org * multiplier 1
    expect(d.org).toBeCloseTo(10);
  });

  it('a non-piercing hit deals little HP damage but still shakes the crew', () => {
    const target = stats({ hp: 100, org: 50, armour: 30 });
    const d = hitDamage(cfg, 20, 15, target, 0.5);
    expect(d.pierced).toBe(false);
    expect(d.hp).toBeCloseTo(2);
    expect(d.org).toBeCloseTo(5);
  });

  it('applies variance to both HP and org damage', () => {
    const target = stats({ hp: 100, org: 50, armour: 0 });
    const low = hitDamage(cfg, 20, 10, target, 0);
    const high = hitDamage(cfg, 20, 10, target, 0.999999);
    expect(low.hp).toBeCloseTo(15);
    expect(high.hp).toBeCloseTo(25);
    expect(low.org).toBeCloseTo(7.5);
  });
});

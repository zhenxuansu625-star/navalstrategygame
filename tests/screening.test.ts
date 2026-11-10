import { describe, expect, it } from 'vitest';
import { capitalReachChance, screeningRatio } from '../src/sim/battle/math';
import { TEST_CONFIG as cfg } from './helpers';

describe('screening', () => {
  it('ratio is screens per capital over the target ratio', () => {
    // target is 3 screens per capital
    expect(screeningRatio(cfg, 3, 1)).toBeCloseTo(1);
    expect(screeningRatio(cfg, 3, 2)).toBeCloseTo(0.5);
    expect(screeningRatio(cfg, 2, 2)).toBeCloseTo(1 / 3);
  });

  it('caps at 1 when over-screened', () => {
    expect(screeningRatio(cfg, 12, 1)).toBe(1);
  });

  it('is 0 with no screens and 1 with no capitals', () => {
    expect(screeningRatio(cfg, 0, 4)).toBe(0);
    expect(screeningRatio(cfg, 5, 0)).toBe(1);
  });

  it('unscreened capitals are always reachable', () => {
    expect(capitalReachChance(cfg, 'heavy', 0, 3)).toBe(1);
    expect(capitalReachChance(cfg, 'torpedo', 0, 3)).toBe(1);
  });

  it('full screening blocks the configured share of attacks', () => {
    expect(capitalReachChance(cfg, 'heavy', 6, 2)).toBeCloseTo(0.5);
    expect(capitalReachChance(cfg, 'torpedo', 6, 2)).toBeCloseTo(0.2);
  });

  it('partial screening blocks proportionally', () => {
    // ratio 0.5 -> blocks 0.5 * protection
    expect(capitalReachChance(cfg, 'light', 3, 2)).toBeCloseTo(0.75);
    expect(capitalReachChance(cfg, 'torpedo', 3, 2)).toBeCloseTo(0.6);
  });

  it('screens stop torpedoes better than gunfire', () => {
    expect(capitalReachChance(cfg, 'torpedo', 4, 2)).toBeLessThan(capitalReachChance(cfg, 'heavy', 4, 2));
  });
});

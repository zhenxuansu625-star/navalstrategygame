import { describe, expect, it } from 'vitest';
import { hitChance } from '../src/sim/battle/math';
import { stats, TEST_CONFIG as cfg } from './helpers';

describe('hit chance', () => {
  const shooter = stats();
  const reference = stats(); // visibility 20, speed 25: no modifiers

  it('equals the base chance against a reference target', () => {
    expect(hitChance(cfg, 'light', shooter, reference)).toBeCloseTo(0.4);
    expect(hitChance(cfg, 'heavy', shooter, reference)).toBeCloseTo(0.3);
    expect(hitChance(cfg, 'torpedo', shooter, reference)).toBeCloseTo(0.2);
  });

  it('adds fire control to guns but not torpedoes', () => {
    const fc = stats({ fireControl: 0.1 });
    expect(hitChance(cfg, 'light', fc, reference)).toBeCloseTo(0.5);
    expect(hitChance(cfg, 'heavy', fc, reference)).toBeCloseTo(0.4);
    expect(hitChance(cfg, 'torpedo', fc, reference)).toBeCloseTo(0.2);
  });

  it('is higher against more visible targets', () => {
    expect(hitChance(cfg, 'heavy', shooter, stats({ visibility: 30 }))).toBeCloseTo(0.4);
    expect(hitChance(cfg, 'heavy', shooter, stats({ visibility: 10 }))).toBeCloseTo(0.2);
  });

  it('is lower against faster targets', () => {
    expect(hitChance(cfg, 'light', shooter, stats({ speed: 35 }))).toBeCloseTo(0.3);
    expect(hitChance(cfg, 'light', shooter, stats({ speed: 20 }))).toBeCloseTo(0.45);
  });

  it('penalises heavy guns against screens only', () => {
    const screen = stats({ line: 'screen' });
    expect(hitChance(cfg, 'heavy', shooter, screen)).toBeCloseTo(0.2);
    expect(hitChance(cfg, 'light', shooter, screen)).toBeCloseTo(0.4);
  });

  it('combines modifiers additively', () => {
    // 0.3 base + 0.05 fc + 0.01*(15-20) - 0.01*(34-25) - 0.1 heavy-vs-screen = 0.11
    const destroyer = stats({ line: 'screen', visibility: 15, speed: 34 });
    expect(hitChance(cfg, 'heavy', stats({ fireControl: 0.05 }), destroyer)).toBeCloseTo(0.11);
  });

  it('clamps to the configured min and max', () => {
    const tiny = stats({ line: 'screen', visibility: 0, speed: 60 });
    expect(hitChance(cfg, 'heavy', shooter, tiny)).toBe(cfg.hit.min);
    const huge = stats({ visibility: 200, speed: 0 });
    expect(hitChance(cfg, 'light', stats({ fireControl: 1 }), huge)).toBe(cfg.hit.max);
  });
});

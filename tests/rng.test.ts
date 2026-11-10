import { describe, expect, it } from 'vitest';
import { createRng, pickWeighted, rngFromState, rngInt } from '../src/sim/rng';

describe('seeded rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const same = Array.from({ length: 20 }, () => a.next() === b.next()).filter(Boolean).length;
    expect(same).toBeLessThan(20);
  });

  it('stays in [0, 1)', () => {
    const r = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('resumes exactly from saved state', () => {
    const a = createRng(99);
    for (let i = 0; i < 10; i++) a.next();
    const b = rngFromState(a.getState());
    for (let i = 0; i < 50; i++) expect(b.next()).toBe(a.next());
  });

  it('rngInt stays in range', () => {
    const r = createRng(3);
    for (let i = 0; i < 1000; i++) {
      const n = rngInt(r, 6);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(6);
    }
  });

  it('pickWeighted follows weights and skips zero weights', () => {
    const r = createRng(5);
    const counts = { a: 0, b: 0, c: 0 };
    const weights = { a: 1, b: 3, c: 0 };
    for (let i = 0; i < 20_000; i++) counts[pickWeighted(r, ['a', 'b', 'c'] as const, (k) => weights[k])!]++;
    expect(counts.c).toBe(0);
    expect(counts.b / counts.a).toBeGreaterThan(2.7);
    expect(counts.b / counts.a).toBeLessThan(3.3);
    expect(pickWeighted(r, [], () => 1)).toBeUndefined();
    expect(pickWeighted(r, ['x'], () => 0)).toBeUndefined();
  });
});

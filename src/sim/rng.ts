/**
 * Seeded pseudo-random number generator (mulberry32).
 * All randomness in the simulation must go through this module so that every
 * battle and campaign can be replayed exactly from a seed.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Internal state; pass to `rngFromState` to resume the exact sequence. */
  getState(): number;
}

export function createRng(seed: number): Rng {
  return rngFromState(seed >>> 0);
}

export function rngFromState(initial: number): Rng {
  let a = initial >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    getState() {
      return a;
    },
  };
}

/** Integer in [0, maxExclusive). */
export function rngInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng.next() * maxExclusive);
}

/**
 * Pick one item with probability proportional to its weight.
 * Returns undefined if there are no items or all weights are zero.
 */
export function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T | undefined {
  let total = 0;
  for (const item of items) total += Math.max(0, weight(item));
  if (total <= 0) return undefined;
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= Math.max(0, weight(item));
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

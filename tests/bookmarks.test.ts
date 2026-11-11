import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOOKMARKS, NATURAL_RIVALS } from '../src/data/bookmarks';
import credits from '../src/data/leaderCredits.json';
import { NATIONS } from '../src/data/nations';
import { createGame, DEFAULT_CONTEXT, nationName } from '../src/sim/economy';

const nationIds = new Set(NATIONS.map((n) => n.id));

describe('campaign start dates', () => {
  it('are in order, each with at least five nations and a unique id', () => {
    const ids = new Set<string>();
    BOOKMARKS.forEach((b, i) => {
      if (i > 0) expect(b.year).toBeGreaterThan(BOOKMARKS[i - 1]!.year);
      expect(ids.has(b.id)).toBe(false);
      ids.add(b.id);
      expect(b.nations.length).toBeGreaterThanOrEqual(5);
      for (const n of b.nations) expect(nationIds.has(n.nationId), n.nationId).toBe(true);
    });
  });

  it('every leader has a portrait and a credit with a free licence', () => {
    const table = credits as Record<string, { license: string; source: string; author: string }>;
    for (const b of BOOKMARKS) {
      for (const { leader } of b.nations) {
        expect(existsSync(`public/leaders/${leader.id}.jpg`), leader.id).toBe(true);
        const c = table[leader.id];
        expect(c, leader.id).toBeDefined();
        expect(c!.license).toMatch(/^(Public domain|CC BY)/);
        expect(c!.source).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      }
    }
  });

  it('Austria-Hungary only exists before 1919, and Russia becomes the Soviet Union', () => {
    for (const b of BOOKMARKS) {
      const austria = b.nations.some((n) => n.nationId === 'austria');
      expect(austria, `${b.year}`).toBe(b.year < 1919);
      const russia = b.nations.find((n) => n.nationId === 'russia')!;
      if (b.year >= 1922) expect(russia.name).toBe('Soviet Union');
    }
  });

  it('every nation can start a game in every bookmark it appears in', () => {
    for (const b of BOOKMARKS) {
      for (const n of b.nations) {
        const rival = (NATURAL_RIVALS[n.nationId] ?? []).find((r) => b.nations.some((x) => x.nationId === r))
          ?? b.nations.find((x) => x.nationId !== n.nationId)!.nationId;
        const names = Object.fromEntries(b.nations.map((x) => [x.nationId, { name: x.name, adjective: x.adjective }]));
        const s = createGame(DEFAULT_CONTEXT, { playerId: n.nationId, rivalId: rival, startYear: b.year, names });
        expect(s.nations[n.nationId]!.fleet.length).toBeGreaterThan(0);
        if (n.name) expect(nationName(DEFAULT_CONTEXT, s, n.nationId).name).toBe(n.name);
      }
    }
  });
});

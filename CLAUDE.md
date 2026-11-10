# Naval Strategy Game

Single-player naval grand strategy, 1890-1945, inspired by Hearts of Iron IV but navy only.
The full design is split across the files in docs/:

- docs/01-overview.md: pitch, pillars, core loop, open decisions
- docs/02-economy-and-nations.md: civilian factories, dockyards, nations
- docs/03-ship-designer.md: hulls, module slots, naval XP, refits
- docs/04-research.md: tech fields and doctrines
- docs/05-battle-system.md: HOI4-style battles, aggressiveness, repair, fleet experience
- docs/06-campaign-and-ai.md: strategic map, wars, AI navies
- docs/07-tech-stack.md: stack and folder layout
- docs/08-roadmap.md: build order in slices

Read only the docs relevant to the current task.

## Architecture rules
- src/sim is pure TypeScript: no UI, DOM or React imports.
- All randomness goes through the seeded RNG in src/sim/rng.ts.
- Game state is one serialisable object; each turn is step(state, orders, rng).
- All balance numbers live in src/data, never hard-coded in logic.

## Workflow
- Work one roadmap slice at a time (docs/08-roadmap.md). Don't start the next slice unless asked.
- Show a short plan before writing code for a new slice.
- Write or update tests in tests/ for every sim change; run `npm test` before finishing.
- After battle-engine changes, run `npm run simulate` and report win-rate shifts.
- Commit after each working step with a clear message.

## Commands
- npm run dev / npm test / npm run simulate

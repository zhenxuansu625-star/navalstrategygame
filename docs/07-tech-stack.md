# Tech stack and code architecture

Use TypeScript in the browser, with the whole simulation as pure, UI-free code. That split is what lets Claude Code test and balance the game on its own.

## Stack

- **Language:** TypeScript (strict mode)
- **Build:** Vite
- **UI screens:** React for menus, ship designer, production and research
- **Battle and strategic map rendering:** PixiJS or plain Canvas
- **Tests:** Vitest
- **Saves:** JSON in localStorage first, file export later

## Folder layout

| Folder | Contains | Rule |
| --- | --- | --- |
| `src/sim/` | Economy, designer, research, battle engine, AI | No imports from UI; pure functions; seeded RNG |
| `src/data/` | Hulls, modules, techs, nations as JSON or TS objects | All balance numbers live here, never hard-coded |
| `src/ui/` | React screens and map renderer | Reads sim state, sends player orders |
| `tests/` | Unit tests + battle simulations | Runs headless in CI |
| `tools/` | Scripts such as `simulate-battles.ts` | Batch runs for balance reports |

**Key rule:** the game state is one serialisable object, and every turn is `nextState = step(state, orders, rng)`. That makes saves, replays and tests almost free.

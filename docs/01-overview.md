# Overview

A single-player naval grand strategy game: you run one nation's navy from 1890 to 1945, design every ship, and fight wars through simulated battles. Think HOI4's long-arc management, focused entirely on the sea.

## Design pillars

- **Your designs matter.** Every ship is a set of trade-offs you chose, and battles expose bad choices.
- **Decades, not days.** Technology, industry and rivals shift; a fleet built for 1905 is obsolete by 1925.
- **Readable simulation.** Combat is detailed underneath, but the player can always see why a ship hit, missed or sank.
- **Deterministic core.** The simulation runs from a seed, so battles can be replayed, tested and balanced automatically.

## Default choices

| Decision | Default | Alternatives |
| --- | --- | --- |
| Era | 1890–1945, dreadnoughts to carriers | Age of sail; Cold War missiles |
| Battle style | HOI4-style: automatic hourly resolution, battle lines, no direct ship control | Pausable real-time |
| Nations | Historical naval powers: 1 player, the rest AI | Fictional nations |
| Platform | Browser (desktop first) | Godot, native |
| Art | Clean 2D top-down, NTDS-style symbols | 3D |

**Out of scope for v1:** land warfare, multiplayer, detailed crew management, historical scenarios.

## Core loop

Each campaign turn is one month.

1. Assign production (civilian factories, dockyards, economy laws)
2. Research
3. Design ships
4. Build and refit
5. Events and tension
6. At war?
   - No: next month, back to step 1.
   - Yes: fleet missions → battles → war score and peace → next month.

A typical session is 10–20 peaceful months of building and arms-racing, punctuated by wars that test every design decision.

## Open decisions

- [ ] Start year: 1890, or a later date such as 1905 or 1922?
- [ ] Working title for the game

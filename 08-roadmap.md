# Build roadmap

Build in vertical slices. Each one is playable on its own and becomes a single Claude Code session or a few of them. Don't start the next slice until the current one has been played.

1. **Battle sandbox:** two hard-coded fleets fight with battle lines, hourly ticks, piercing vs armour, damage, organisation and retreat. Hourly log included. Tests cover hit, piercing and screening maths.
2. **Ship designer:** hull and module-slot designer showing stats and production cost; designs feed straight into the sandbox.
3. **Fleet battles:** spotting, aggressiveness and repair rules, fleet experience, carriers and air waves, critical hits, admirals, positioning, and auto-resolve.
4. **Balance harness:** `tools/simulate-battles.ts` runs 1,000 battles between designs and reports win rates.
5. **Economy loop:** monthly turns, civilian factories, dockyards, the construction queue, naval production lines and one rival nation.
6. **Research:** tech fields that unlock hulls and modules in the designer.
7. **War and strategic map:** sea zones, missions, battles triggered by fleet movement, repairs at naval bases, war score, peace.
8. **AI navies and historical nations:** all eight nations, AI designs ships, builds a fleet and fights strategically.
9. **Torpedoes, aircraft and carriers:** full unit types in battle.
10. **Polish:** historical events, treaties, save/load, tutorial, art pass.

Slices 1–4 already give you a fun ship-design-and-battle game; everything after that is the strategy layer.

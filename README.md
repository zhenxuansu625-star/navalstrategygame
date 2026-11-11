# Naval Strategy Game

Single-player naval grand strategy, 1890-1945, inspired by Hearts of Iron IV but navy only.
Design notes live in [`docs/`](docs/); the build order is in [`docs/08-roadmap.md`](docs/08-roadmap.md).

**Play it:** https://zhenxuansu625-star.github.io/navalstrategygame/ (deployed from `main` by GitHub Actions).

## How to play

The game opens on a **main menu** with two modes. Both include the **ship designer**.

- **Campaign.** Pick a start date (1890, 1906, 1914, 1922, 1936 or 1939) and a nation, shown by its leader
  at that date, plus a rival. Every nation starts with its historical fleet for that date (rounded; sources
  and counting rules in `src/data/startingFleets.ts`). A live clock runs the campaign day by day: pause with the button or the space
  bar, and pick speed 1–5 (or use + and -). The campaign has no end date.
  - **Economy.** Civilian factories build factories, dockyards and infrastructure through a construction
    queue; naval production lines build your designs and the presets; trade imports steel and chromium.
  - **War game.** Send your whole fleet against your rival's. Sunk ships are lost and survivors keep their
    damage. Damaged ships fight damaged unless you send them to dock: **Repair** a ship, **Repair all**, or
    **Cancel repairs**. Only a few ships fit in dock at once (more dockyards, more berths).
- **Battle sandbox.** Build two fleets from any designs, or load a ready-made scenario (Blue vs Red 1915,
  Dreadnought clash 1916, Carrier strike 1942, Wolfpack 1942), and watch them fight hour by hour.

**Ships** come in era tiers: Pre-dreadnought, Early, Basic, Improved and Advanced, from destroyers to
battleships, carriers and **submarines**. Submarines stay hidden until enemy sonar finds them or they give
themselves away by firing, and only depth charges can hit them. Snorkels and anechoic tiles make them harder
to find.

Leader portraits are historical photographs from Wikimedia Commons; see **Credits** on the main menu and
`src/data/leaderCredits.json` for sources and licences.

## Development

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run simulate   # 1,000 seeded battles; add -- --scenario jutland|carriers|wolfpack
npm run simulate:economy   # economy and nation balance report (add -- --quick to skip battles)
npm run build      # typecheck and production build
```

Layout: `src/sim` (pure TypeScript simulation, no UI), `src/data` (all balance numbers),
`src/ui` (React), `tests/`, `tools/`. See [`CLAUDE.md`](CLAUDE.md) for the architecture rules.

## Deployment

`.github/workflows/deploy.yml` runs tests, builds and publishes `dist/` to GitHub Pages on every
push to `main`. One-time setup: **Settings → Pages → Source: GitHub Actions**.

If the site does not update after a merge:

1. Open the **Actions** tab and check the latest **Deploy to GitHub Pages** run.
2. If the `deploy` job failed with *"Deployment failed, try again later"*, that is a temporary
   GitHub Pages outage: open the run and click **Re-run failed jobs**, or use **Run workflow** on `main`.
   If `npm test` or `npm run build` failed instead, the change itself needs fixing.
3. Once the run is green, hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R). GitHub Pages caches
   pages for up to 10 minutes.

Keep only this one Pages workflow: a second one (for example GitHub's Jekyll template) would publish
the raw repository instead of the built game.

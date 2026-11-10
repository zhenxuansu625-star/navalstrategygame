# Naval Strategy Game

Single-player naval grand strategy, 1890-1945, inspired by Hearts of Iron IV but navy only.
Design notes live in [`docs/`](docs/); the build order is in [`docs/08-roadmap.md`](docs/08-roadmap.md).

**Play it:** https://zhenxuansu625-star.github.io/navalstrategygame/ (deployed from `main` by GitHub Actions).

## Current state: roadmap slices 1 and 2

- **Ship designer:** pick a hull, fill its fixed, main, secondary and custom slots, and see
  derived stats, production cost, build time, a comparison with another design and a piercing check
  against every other design. Presets are read-only; copy one to edit it. Your designs are saved in
  this browser.
- **Battle sandbox:** build two fleets from any designs and watch them fight in hourly ticks:
  battle lines (screens and capitals), hit chance, piercing vs armour, HP and organisation,
  screening, retreat and escape, an hourly log and an after-action report. Battles are seeded,
  so the same seed and fleets always give the same battle.

## Development

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run simulate   # 1,000 seeded battles of the default fleets, win rates and losses
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

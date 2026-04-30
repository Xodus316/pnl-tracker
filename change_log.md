# Change Log

All notable changes to pnl-tracker, in chronological order. Times are approximate within a single day of development unless otherwise noted.

---

## 2026-04-30 16:00:54 PDT — GitHub setup

- Initialized `pnl-tracker` as a git repository on the `main` branch.
- Added `*.tsbuildinfo` to `.gitignore` so TypeScript build cache files are not committed.
- Prepared the project for initial commit and GitHub push.

---

## 2026-04-30 — Initial development

### Project scaffolding
- Created repo at `/Users/alexanderhenry/projects/pnl-tracker`.
- Picked Node.js + Express + Prisma + Postgres + React (Vite + TS) stack at the user's request.
- Wrote `docker-compose.yml` with `postgres`, `api`, and `web` services.
- Initial Prisma schema with `Trade` model.
- Express API with `/api/health`, `/api/upload` (CSV multipart, replace-all), `/api/trades`, `/api/pnl/series`, `/api/pnl/strategies`, `/api/pnl/summary`.
- Vite + React frontend with Dashboard, Trades, Upload pages.
- Recharts P&L bar chart; KPI cards; sortable strategy breakdown.

### Port conflict fixes
- `5432` taken on host → bumped Postgres host port to **5433**.
- `5433` also taken → bumped to **5434**.
- `4000` taken on host → bumped API host port to **4001**.
- Container-internal ports unchanged; nginx still proxies to `api:4000`.

### Docker base image fix
- Switched `api/Dockerfile` from `node:20-alpine` → `node:20-slim` (Debian).
  - Alpine + Prisma's schema engine produced `Could not parse schema engine response: SyntaxError: Unexpected token 'E', "Error load"...` — a libssl/musl mismatch.
  - Also installed `openssl` + `ca-certificates` and switched the runtime stage to copy the full `node_modules` from build (the prisma CLI is a devDependency, was being stripped by `--omit=dev`).

### Bug fixes — column naming
- Raw SQL was using snake_case (`close_date`, `win_loss`) but Prisma created **camelCase** Postgres columns (because no `@map` directives on field-level).
- Fixed all raw SQL to double-quote: `"closeDate"`, `"winLoss"`. Lowercase columns left unquoted.

### Parser fixes (per user feedback)
- **Win/Loss column** is `1`/`0`, not `W`/`L`. Updated parser: `1` → W, `0` → L; `W*`/`L*` still recognized; falls back to `Profit > 0` if empty.
- **Dash (`-`) in price columns** means $0, not "missing". Updated `parseMoney` to return `"0"` for `-`.

### Strategy Breakdown enhancements
- Added a **Direction** column (Short/Long pill); rows now grouped by `direction + strategy` so Short Iron Condor and Long Iron Condor are separate entries.
- Made all column headers **clickable for sorting**, with asc/desc toggle and active-column ▲/▼ indicator. Default sort: Total P&L desc.

### Tooltip readability
- The default Recharts tooltip rendered black text on dark background. Added explicit `contentStyle.color`, `itemStyle`, and a colored P&L value (green/red by sign).

### Bar tooltip — per-bucket trade list
- Extended `/api/pnl/series` to include `trades: BucketTrade[]` per bucket via Postgres `json_agg`.
- Replaced default tooltip with custom React component showing bucket date, total P&L, trade count, and a per-trade list (direction badge, ticker, strategy, individual P&L). Sorted by profit desc, capped at 25 with "+ N more" line.

### LAN access
- Confirmed default docker port mapping is `0.0.0.0`, so `web` is reachable on the LAN at `http://<host-ip>:8080` without changes. Documented in chat.

### Big batch — analytics + workflow
- **Cumulative equity curve** overlaid on PnLChart via Recharts `ComposedChart` + secondary Y axis.
- **Profit factor + Expectancy + Avg win + Avg loss** added to `/api/pnl/summary` and rendered as KPI cards. Profit factor turns red below 1.0.
- **Drill-down** on bar click (sets from/to filters via `bucketRange(bucket, period)`) and on Strategy Breakdown row click (sets direction + strategy filters).
- **Append + dedup** import mode (vs replace-all). Mode toggle on Upload page. Server dedup key: `openDate|closeDate|stock|direction|strategy|strikes|amount|openingPrice|closingPrice`. Returns `duplicatesSkipped` count.
- **Nightly backups** via `prodrigestivill/postgres-backup-local` service in docker-compose. Defaults: 7 daily / 4 weekly / 6 monthly retention in `./backups`. Configurable via `BACKUP_SCHEDULE`, `BACKUP_KEEP_*` env vars.

### Big batch — daily-use ergonomics + safety + best/worst
- **Date-range presets** above FiltersBar: All / Today / This week / MTD / Last 30d / Last 90d / YTD. Active preset highlights green.
- **Drawdown chart** using Recharts AreaChart with peak-to-trough underwater plot and max DD callout.
- **Calendar heatmap** custom SVG component, columns = weeks, rows = Mon–Sun, color-scaled by P&L magnitude. Click any active day to drill down.
- **Best/worst trades** — new endpoint `/api/trades/extremes` returning top winners, bottom losers, and outlier-impact sums (`withoutWorstN`, `withoutBestN`). Side-by-side tables + 3 callout cards on the Dashboard.
- **Import history + rollback** — schema gained `ImportBatch` model (nullable `batchId` FK on `Trade` with cascade delete). New endpoints: `GET /api/imports`, `DELETE /api/imports/:id`. Upload page shows recent imports table with confirm-step Undo button.
- **Google Sheets sync** — added `googleapis` dependency, `lib/sheets.ts` with service-account auth, `/api/sync/status` and `POST /api/sync` endpoints. Refactored CSV parser into reusable `parseRows(rows: string[][])` so both upload and sync use the same path. New mounted volume `./credentials:/app/credentials:ro` for the JSON key. Setup steps documented in README.
- **Refactored** upload route into `lib/import.ts:persistImport` so both `/api/upload` and `/api/sync` share the same DB write path.

### Tests
- Refactored `src/index.ts` → `src/app.ts` (exports `createApp()`) + `src/index.ts` (calls `app.listen`). Lets tests hit the app via supertest without binding a port.
- Added vitest + supertest. Test isolation via `?schema=test` URL param on the same Postgres (separate from production `public` schema).
- `tests/global-setup.ts` runs `prisma db push` once. `tests/setup.ts` truncates between tests. Single-fork pool avoids DB races.
- 36 tests across 6 files: health, upload (replace + append + dashes + 1/0 W/L), trades (list, filters, facets, extremes + outlier impact), pnl (summary, series day/month/year, strategies), imports (list, rollback cascade), sync (with `vi.mock`'d googleapis).
- Added `tsconfig.test.json` and `npm run typecheck:all` to type-check tests too.

### Diagnostic features
- **`/api/pnl/by-dow`** — groups by `EXTRACT(ISODOW FROM "closeDate")`, zero-fills missing days so the chart always has 7 columns.
- **`/api/pnl/holding-period`** — returns per-trade `{days, profit, stock, direction, strategy, closeDate, winLoss}` for scatter plot. Days computed in SQL: `("closeDate" - "openDate")::int`.
- **`/api/pnl/streaks`** — fetches all trades sorted by closeDate ASC, computes longest/avg/current win and loss streaks in JS.
- **BotVsManual** component — two `Panel`s rendered side by side, each calling `/api/pnl/summary` with `bot=true` and `bot=false`.
- **DowChart** — Mon–Sun bar chart, color-coded green/red.
- **HoldingPeriodScatter** — Recharts ScatterChart, two series (wins green, losses red), avg-held callout in header.
- **StreaksPanel** — 5 KPI-style cards (current, longest W, longest L, avg W streak, avg L streak).
- 6 new tests in `tests/diagnostics.test.ts` covering DOW zero-fill, holding-period day math, and streak computation against a known W/W/W/L/L/W/L/L/L sequence. **Total now 42 tests.**

### Documentation
- Created `CLAUDE.md` (project context for future Claude sessions).
- Created `architecture.md` (component diagram, data flow, schema, API surface).
- Created `change_log.md` (this file).

---

## Suggested next features (not yet implemented)

In rough priority order:

- **Tax export (Form 8949 CSV)** — group closed trades into short-term / long-term tabs.
- **Basic auth via Caddy** — required before any non-LAN deploy. Single user/password env-var-driven, ~20 lines of compose.
- **In-app notes/tags editing** — currently the only way to fix a typo in `notes` is fix the sheet and re-import.
- **Saved filter presets** — name a filter combo ("0DTE only") and recall from a dropdown.
- **Goal tracking** — set a monthly/yearly P&L target, render progress on Dashboard + heatmap.
- **Wash-sale flagging** — flag closes where a substantially-identical position reopened within 30 days.
- **Mobile-friendly Trades table** — card layout instead of dense rows.

## Known issues / caveats

- Trades imported before the `ImportBatch` schema change have `batchId = NULL` and don't appear in the Import History UI. Re-importing in replace-all mode associates everything with a fresh batch.
- The runtime Docker image bundles the prisma CLI (devDependency) by copying full `node_modules` from the build stage. Slightly bigger image, but `prisma db push` runs at startup so it's required.
- The vite dev server has a known moderate-severity esbuild advisory (dev-server only; doesn't affect the production nginx build). Not patched yet — would require a vite major upgrade.
- Backups have not been validated end-to-end with a restore. Recommend doing a manual restore drill before relying on them.

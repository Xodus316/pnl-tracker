# pnl-tracker — Claude Notes

Project context for future Claude sessions. Read this first.

## What this is

A single-user, local-first web app to track stock and options trades and visualize realized P&L. The user maintains trades in a Google Sheet; the app ingests them via CSV upload or Google Sheets sync and renders dashboards bucketed by day / week / month / year, plus diagnostic views (drawdown, calendar heatmap, day-of-week analysis, holding-period scatter, streaks, best/worst trades, bot vs manual).

Deployment target: runs locally via `docker compose up`, but everything is containerized so it can be moved to AWS (ECS / Fargate / EC2 + RDS) without code changes — just override `DATABASE_URL`.

## Stack

| Layer | Choice |
|---|---|
| API | Node 20 + Express + TypeScript |
| ORM | Prisma 5 |
| DB | Postgres 16 |
| Frontend | Vite + React 18 + TypeScript |
| Charts | Recharts |
| Styling | Tailwind CSS |
| State / fetching | TanStack Query (React Query v5) |
| CSV parsing | papaparse |
| Sheet sync | googleapis (service-account auth) |
| File upload | multer (memoryStorage) |
| Tests | vitest + supertest |
| Container | docker compose (postgres, api, web/nginx, backup) |
| Backups | prodrigestivill/postgres-backup-local |

## Repo layout

```
pnl-tracker/
├── docker-compose.yml          # postgres + api + web + backup
├── .env                        # local secrets (gitignored)
├── .env.example                # template — copy to .env
├── README.md                   # user-facing docs
├── CLAUDE.md                   # ← you are here
├── architecture.md             # diagram + data flow
├── change_log.md               # timestamped change history
├── credentials/                # Google service account JSON (gitignored)
├── backups/                    # nightly pg_dump output (gitignored)
├── api/
│   ├── Dockerfile              # node:20-slim multi-stage
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.test.json      # extends tsconfig.json, includes tests
│   ├── vitest.config.ts        # uses ?schema=test on shared DB
│   ├── prisma/schema.prisma    # Trade + ImportBatch
│   ├── src/
│   │   ├── app.ts              # createApp() — exported for tests
│   │   ├── index.ts            # imports app, calls listen
│   │   ├── types.ts            # shared types
│   │   ├── lib/
│   │   │   ├── db.ts           # Prisma singleton
│   │   │   ├── csv.ts          # parseCsv + parseRows + dedupKey
│   │   │   ├── import.ts       # persistImport (replace/append + batch creation)
│   │   │   ├── pnl.ts          # all aggregations (summary, series, dow, streaks, etc.)
│   │   │   └── sheets.ts       # Google Sheets fetch
│   │   └── routes/
│   │       ├── upload.ts       # POST /api/upload
│   │       ├── trades.ts       # GET /api/trades, /facets, /extremes
│   │       ├── pnl.ts          # /summary /series /strategies /by-dow /holding-period /streaks
│   │       ├── imports.ts      # GET + DELETE /api/imports/:id
│   │       └── sync.ts         # GET /status, POST /
│   └── tests/                  # vitest integration tests
└── web/
    ├── Dockerfile              # node build → nginx:alpine
    ├── nginx.conf              # static + proxy /api → api:4000
    ├── package.json
    ├── vite.config.ts          # dev proxy /api → :4000
    ├── tailwind.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx             # router + nav
        ├── api/client.ts       # typed fetch wrappers
        ├── lib/
        │   ├── format.ts       # fmtUsd, fmtPct, pnlColor
        │   └── buckets.ts      # bucket → date range
        ├── pages/
        │   ├── Dashboard.tsx
        │   ├── Trades.tsx
        │   └── Upload.tsx
        └── components/
            ├── KpiCards.tsx
            ├── PnLChart.tsx              # bars + cumulative equity line
            ├── DrawdownChart.tsx
            ├── CalendarHeatmap.tsx       # custom SVG
            ├── DowChart.tsx
            ├── HoldingPeriodScatter.tsx
            ├── StreaksPanel.tsx
            ├── BotVsManual.tsx
            ├── BestWorstTrades.tsx
            ├── StrategyBreakdown.tsx
            ├── PeriodToggle.tsx
            ├── DateRangePresets.tsx
            ├── FiltersBar.tsx
            ├── ImportHistory.tsx
            ├── SyncFromSheet.tsx
            └── TradeTable.tsx (in pages/Trades.tsx)
```

## Common commands

```bash
# Run everything
docker compose up --build

# Local dev (without Docker for the app code)
docker compose up postgres -d
cd api && npm install && npx prisma db push && npm run dev   # :4000
cd web && npm install && npm run dev                          # :5173 (proxies /api → :4000)

# Tests
cd api && npm test           # vitest, 42 tests, ~3s. Requires Postgres up.
cd api && npm run test:watch
cd api && npm run typecheck:all   # also typechecks tests

# Rebuild a single service after code change
docker compose up -d --build api
docker compose up -d --build web

# Restore from backup
gunzip -c ./backups/daily/pnl-YYYY-MM-DD.sql.gz \
  | docker compose exec -T postgres psql -U pnl -d pnl
```

## Ports (host side; check `.env`)

| Service | Default | Why |
|---|---|---|
| `web` (nginx) | **8080** | The browser hits this. Proxies /api internally. |
| `api` (Express) | **4001** | Originally 4000, bumped because :4000 was taken on this Mac. |
| `postgres` | **5434** | Originally 5432, bumped twice — 5432 and 5433 were taken. |

The container's *internal* port for api is always 4000. nginx in the web container talks to `api:4000` over the docker network — host port mapping is independent.

## Source data — Google Sheet column order

```
Date | Expiration | Close Date | Stock | Strategy | Strategy | Strikes | Amount | Opening Price | Closing Price | Fees | Profit | Win/Loss | Broker | Bot | Notes
```

**Two columns are both literally named `Strategy`** — first is direction (Short/Long), second is structure (Call / Put / Iron Condor / Iron Fly / 0dte Put Vertical / etc.). The parser reads by **column index**, not by header name.

Parser quirks (in `api/src/lib/csv.ts`):
- Rows with empty `Close Date` are silently skipped (closed positions only).
- Rows with empty `Date` (open) are reported as errors.
- `-` in any money column parses as `0` (user requested this).
- `Win/Loss` accepts `1`/`0` (the user's actual format), `W`/`L`, or `Win`/`Loss`. If empty, derived from `Profit > 0`.
- `Bot` accepts `TRUE`/`FALSE`/`1`/`0`/`yes`/`no`.
- Date formats tried in order: `M/d/yyyy`, `MM/dd/yyyy`, `yyyy-MM-dd`, `M/d/yy`, then JS `new Date()`.
- The sheet's `Profit` column is **trusted as authoritative** — never recomputed.

## Database

Schema is in `api/prisma/schema.prisma`. Two tables:
- `trades` — one row per closed trade, with `batchId` FK (nullable) to `import_batches`
- `import_batches` — one row per upload/sync; cascade-deletes trades on rollback

**IMPORTANT — column naming gotcha:** Prisma maps camelCase model fields to camelCase Postgres columns by default. So in **raw SQL**, you must double-quote camelCase columns: `"closeDate"`, `"winLoss"`, `"openDate"`. Lowercase columns (`profit`, `stock`, `strategy`, `direction`, `broker`, `bot`) don't need quoting. The table itself is mapped to `trades` via `@@map`.

Schema migrations: we use `prisma db push --accept-data-loss` in the Dockerfile CMD (no migration files). For a single-user app where data can be re-imported from the source sheet, this is fine. If schema becomes prod-critical, switch to `prisma migrate dev` + commit migration files.

## Test isolation

Tests run against the same Postgres but in a different schema (`?schema=test` on the URL). Production data lives in `public`, tests live in `test`. `vitest.config.ts` sets `DATABASE_URL` to the test URL via `env`. `tests/global-setup.ts` runs `prisma db push` once. `tests/setup.ts` truncates `trades` + `import_batches` `beforeEach`. Tests use `pool: 'forks'` with `singleFork: true` to avoid concurrent DB access.

`tests/sync.test.ts` mocks `lib/sheets.ts` via `vi.mock` so no live Google API calls happen.

## Conventions

- **TypeScript strict** everywhere.
- **Decimals** (`Prisma.Decimal`) for money in the DB; converted to `string` over the wire (avoid float precision loss in JSON), to `number` in React state for chart math (precision sacrificed for ergonomics — fine for visualization).
- **Trade query keys** in TanStack Query are `[queryName, filters, ...rest]`. After any mutation, call `queryClient.invalidateQueries()` (no key = invalidate all) so the dashboard refetches.
- **Dark theme only** for now. Tailwind classes assume `bg-slate-950` background.
- **No emoji in code or files** unless the user explicitly asks.
- **No `npm install` in the runtime Docker stage** — we copy `node_modules` from the build stage so the prisma CLI (a devDependency) is available for `db push` at startup.
- **Server stays the source of truth for filtering and aggregation.** Don't fetch all trades and filter client-side; pass filters to the API.

## Drill-down behavior

- **PnLChart bar click** → calls `bucketRange(bucket, period)` (uses date-fns) to compute `from`/`to`, sets them as filters. Selected period (day/week/month/year) determines the range width.
- **Strategy Breakdown row click** → sets `direction` and `strategy` filters together (rows are grouped by both).
- **CalendarHeatmap day click** → sets `from`/`to` to that single day.
- All filters live in `Dashboard` component state. Multiple components share via props.

## Sheet sync setup

User must:
1. Create a Google Cloud service account, download JSON key, save to `./credentials/google.json`.
2. Share the spreadsheet with the service account's email (Viewer is enough).
3. Set `GOOGLE_SHEET_ID` (and optionally `GOOGLE_SHEET_RANGE`, default `A:P`) in `.env`.
4. `docker compose up -d --build api` to pick up env changes.

`/api/sync/status` returns `{ configured, sheetId }` — frontend uses this to show setup instructions vs the Sync button.

## Open improvements / suggested next features

See change_log.md "Suggested next" section. Top contenders:
- Tax export (Form 8949 CSV)
- Basic auth via Caddy in front of nginx (required before any non-LAN deploy)
- In-app notes/tags editing (currently round-trips via the sheet)
- Saved filter presets
- Goal tracking (monthly/yearly P&L target with progress bar)

## Things to remember

- **The user trades real money.** Don't break aggregations silently — verify changes via `curl` and the smoke-test endpoints before declaring done.
- **The user's Profit column is authoritative.** Don't substitute computed P&L.
- **Replace-all is destructive.** When changing the upload code path, never do anything that could lose batches without a clear UI warning.
- **Backups are configured but not validated.** First run that exercises the restore path will be the user's first time finding out if it works. Suggest a manual restore drill if a major change touches the schema.

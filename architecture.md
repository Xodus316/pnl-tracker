# Architecture

## High-level diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Host machine                                │
│                                                                      │
│   Browser  ──────►  :8080 ────►  ┌──────────────────────────┐        │
│                                  │  web container           │        │
│                                  │  ┌────────────────────┐  │        │
│                                  │  │  nginx             │  │        │
│                                  │  │  - serves /dist    │  │        │
│                                  │  │  - proxies /api    │  │        │
│                                  │  └─────────┬──────────┘  │        │
│                                  └────────────┼─────────────┘        │
│                                               │                      │
│                              docker network   │                      │
│                                               ▼                      │
│                                  ┌──────────────────────────┐        │
│                                  │  api container           │        │
│                                  │  Express :4000           │        │
│                                  │  ├─ routes/              │        │
│                                  │  ├─ lib/                 │        │
│                                  │  └─ Prisma client        │        │
│                                  └────┬─────────────────┬───┘        │
│                                       │                 │            │
│                                       │ DATABASE_URL    │            │
│                                       ▼                 │            │
│                                  ┌──────────────┐       │            │
│                                  │  postgres    │       │            │
│                                  │  :5432       │       │            │
│                                  │  pgdata vol  │       │            │
│                                  └──────┬───────┘       │            │
│                                         │               │            │
│                                         │ pg_dump       │            │
│                                         ▼               │            │
│                                  ┌──────────────┐       │            │
│                                  │  backup      │       │            │
│                                  │  cron        │       │            │
│                                  │  ./backups   │       │            │
│                                  └──────────────┘       │            │
│                                                         │            │
└─────────────────────────────────────────────────────────┼────────────┘
                                                          │
                                  ┌───────────────────────┴───────────┐
                                  │  External (only if configured)    │
                                  │  Google Sheets API                │
                                  │  via service account JSON         │
                                  └───────────────────────────────────┘
```

## Containers

| Service | Image | Port (host:container) | Purpose |
|---|---|---|---|
| `web` | custom (nginx:1.27-alpine + Vite build) | 8080:80 | Static SPA, reverse proxy for /api |
| `api` | custom (node:20-slim) | 4001:4000 | Express + Prisma |
| `postgres` | postgres:16-alpine | 5434:5432 | Application DB + tests (separate schema) |
| `backup` | prodrigestivill/postgres-backup-local:16 | — | Cron-driven `pg_dump` to `./backups` volume |

Internal network: containers reach each other by service name (`api`, `postgres`). nginx in `web` proxies `/api/*` to `http://api:4000`. The browser never talks to the API host port directly.

## Data flow — import (manual upload)

```
Browser file picker
  │  multipart POST /api/upload   (file=<csv>, mode=replace|append)
  ▼
nginx (web container) → forwards to api:4000
  ▼
multer.memoryStorage()   → req.file.buffer
  ▼
parseCsv(buffer)
  ├─ papaparse → string[][]
  └─ parseRows(rows)
       ├─ skip empty Close Date rows  → counted in `skipped`
       ├─ map columns by index (handles dup "Strategy" header)
       ├─ coerce dates via date-fns (multiple formats tried)
       ├─ parseMoney: "-" → "0", strip $/, ()
       └─ derive winLoss: 1→W, 0→L, else from profit sign
  ▼
persistImport({ trades, mode, source: "upload", filename })
  ├─ replace mode: TRUNCATE trades + import_batches → INSERT batch → INSERT trades(batchId)
  └─ append mode: SELECT existing keys → in-memory dedup Set → INSERT batch → INSERT non-dupes
  ▼
JSON: { mode, inserted, skipped, duplicatesSkipped, batchId, errors[] }
```

## Data flow — import (Google Sheet sync)

```
POST /api/sync (mode=replace|append)
  ▼
isSheetsConfigured()  → 400 if not configured
  ▼
fetchSheetRows()
  ├─ google.auth.GoogleAuth (service-account JSON from /app/credentials)
  └─ sheets.spreadsheets.values.get → string[][]
  ▼
parseRows(rows)         (same path as CSV from here)
  ▼
persistImport({ source: "sheet", filename: "sheet:<id>" })
  ▼
JSON ImportResult
```

## Data flow — dashboard render

```
Dashboard mount
  ▼
TanStack Query parallel fan-out:
  ├─ /api/pnl/summary?<filters>
  ├─ /api/pnl/series?period=<p>&<filters>             (bars + cumulative + tooltip trade list)
  ├─ /api/pnl/series?period=day&<filters>             (calendar heatmap)
  ├─ /api/pnl/strategies?<filters>                    (strategy breakdown)
  ├─ /api/pnl/by-dow?<filters>                        (day-of-week chart)
  ├─ /api/pnl/holding-period?<filters>                (scatter)
  ├─ /api/pnl/streaks?<filters>                       (streak KPIs)
  ├─ /api/trades/extremes?limit=10&<filters>          (best/worst tables + outlier impact)
  └─ /api/pnl/summary?bot=true,  /api/pnl/summary?bot=false  (BotVsManual panel)
  ▼
Server runs raw SQL aggregations against Postgres (date_trunc, EXTRACT(ISODOW), json_agg)
  ▼
Components render. Drill-down clicks call setFilters → ALL queries refetch.
```

## Database schema

```
trades
─────
  id              SERIAL PK
  openDate        DATE
  expiration      DATE NULL
  closeDate       DATE                       indexed
  stock           TEXT                       indexed
  direction       TEXT                       (Short / Long)
  strategy        TEXT                       indexed
  strikes         TEXT NULL
  amount          INT
  openingPrice    NUMERIC(12,4)
  closingPrice    NUMERIC(12,4)
  fees            NUMERIC(12,4)
  profit          NUMERIC(12,2)              ← trusted from sheet
  winLoss         TEXT                       ('W' / 'L')
  broker          TEXT NULL                  indexed
  bot             BOOLEAN
  notes           TEXT NULL
  createdAt       TIMESTAMP
  batchId         INT NULL → import_batches.id   indexed, ON DELETE CASCADE

import_batches
──────────────
  id              SERIAL PK
  filename        TEXT NULL
  mode            TEXT             ('replace' / 'append')
  source          TEXT             ('upload' / 'sheet')
  rowsInserted    INT
  importedAt      TIMESTAMP
```

**Column naming**: Prisma defaults to camelCase Postgres columns. Raw SQL must double-quote them: `"closeDate"`, `"winLoss"`, `"openDate"`, etc. Lowercase columns (`profit`, `stock`, `strategy`, etc.) don't need quoting.

## API surface

### Health
- `GET  /api/health` — `{ ok: true }`

### Upload
- `POST /api/upload` — multipart `file`, form field `mode=replace|append`. Returns `ImportResult`.

### Trades
- `GET  /api/trades?stock=&strategy=&direction=&broker=&bot=&from=&to=&page=&pageSize=` — paginated list, sorted by closeDate desc.
- `GET  /api/trades/facets` — distinct values for filter dropdowns.
- `GET  /api/trades/extremes?...&limit=10` — top winners + bottom losers + outlier-impact sums.

### P&L aggregations
- `GET  /api/pnl/summary?<filters>` — totalProfit, trades, wins, losses, winRate, avgProfit, avgWin, avgLoss, grossWin, grossLoss, **profitFactor**, **expectancy**.
- `GET  /api/pnl/series?period=day|week|month|year&<filters>` — `[{ bucket, profit, tradeCount, trades: [...] }]`. Trades inside each bucket are pre-aggregated via Postgres `json_agg` and used for the bar-chart hover tooltip.
- `GET  /api/pnl/strategies?<filters>` — grouped by direction + strategy, sorted by profit desc.
- `GET  /api/pnl/by-dow?<filters>` — array of 7 buckets (Mon..Sun), zero-filled if empty.
- `GET  /api/pnl/holding-period?<filters>` — per-trade `{days, profit, ...}` for scatter plot.
- `GET  /api/pnl/streaks?<filters>` — current/longest/avg win+loss streak counts.

### Imports
- `GET    /api/imports` — recent batches with `rowsRemaining` (after potential dedup'ing by later imports).
- `DELETE /api/imports/:id` — cascade-deletes the batch's trades.

### Sheets sync
- `GET  /api/sync/status` — `{ configured, sheetId }`.
- `POST /api/sync` — body `{ mode }`. Same persistence path as upload.

## Frontend component tree

```
App
├── /                Dashboard
│   ├── PeriodToggle
│   ├── DateRangePresets
│   ├── FiltersBar
│   ├── KpiCards (7 cards)
│   ├── PnLChart           (bars + cumulative line)
│   ├── DrawdownChart
│   ├── CalendarHeatmap
│   ├── StreaksPanel
│   ├── BotVsManual        (× 2 internal Panels)
│   ├── DowChart
│   ├── HoldingPeriodScatter
│   ├── BestWorstTrades
│   └── StrategyBreakdown
│
├── /trades          Trades
│   ├── FiltersBar
│   ├── (paginated table)
│
└── /upload          Upload
    ├── SyncFromSheet      (visible only if configured)
    ├── (mode toggle + drag-drop)
    └── ImportHistory
```

Filters are component state in each page. The Dashboard threads `filters` through every panel as a prop or via the TanStack Query cache key.

## Build pipeline

### API (`api/Dockerfile`)
1. Stage 1 (`build`): `node:20-slim` + `apt openssl ca-certificates`. `npm install`, `prisma generate`, `npm run build` (tsc → `dist/`).
2. Stage 2 (`runtime`): `node:20-slim` + openssl. Copies entire `node_modules` from stage 1 (so the prisma CLI is present), `dist/`, and `prisma/`. CMD runs `prisma db push --skip-generate --accept-data-loss && node dist/index.js` so schema is synced on startup.

### Web (`web/Dockerfile`)
1. Stage 1: `node:20-alpine`. `npm install`, `npm run build` → `dist/`.
2. Stage 2: `nginx:1.27-alpine`. Copies `dist/` + `nginx.conf`. Static + reverse proxy.

## Backup architecture

`prodrigestivill/postgres-backup-local:16` runs as a separate container. Cron-driven `pg_dump`s land in `./backups/` (host volume). Default schedule `@daily`, retention 7 daily / 4 weekly / 6 monthly. Configurable via `BACKUP_SCHEDULE` and `BACKUP_KEEP_*` in `.env`. The container needs no exposed port; restoration is a manual `gunzip | psql` via `docker compose exec`.

## Test architecture

```
vitest.config.ts
  ├─ env.DATABASE_URL = ?schema=test    (separate from production data)
  ├─ globalSetup: tests/global-setup.ts → npx prisma db push
  ├─ setupFiles: tests/setup.ts          → truncate beforeEach
  └─ pool: forks (singleFork: true)      → no DB contention

tests/
├── fixtures.ts          # SAMPLE_CSV, BASE_TRADES, seedTrades helper
├── health.test.ts       # 1 test
├── upload.test.ts       # 6 tests: replace, append+dedup, dashes, 1/0 W/L
├── trades.test.ts       # 10 tests: list, filters, facets, extremes
├── pnl.test.ts          # 8 tests: summary, series day/month/year, strategies
├── imports.test.ts      # 5 tests: list, rollback cascade
├── sync.test.ts         # 6 tests: vi.mock'd sheets lib, replace+append, errors
└── diagnostics.test.ts  # 7 tests: by-dow zero-fill, holding period, streak math
                                                                  ───────────
                                                                  42 tests
```

Tests hit the real Express app via `createApp()` (extracted from `src/index.ts`) using `supertest`. No HTTP server is bound; `supertest` calls the app directly.

## Cross-cutting concerns

- **Timezone**: all date math uses the user's local TZ (default `America/New_York`, env `TZ`). Postgres `date_trunc` runs in the container's TZ.
- **Money precision**: stored as `NUMERIC` in Postgres, transmitted as strings, displayed via `Intl.NumberFormat`. Charts use JS numbers.
- **Filtering**: every aggregation endpoint shares `buildWhereSql(filters)` in `lib/pnl.ts` so filter semantics stay consistent across views.
- **Dedup key** (`api/src/lib/csv.ts:dedupKey`): joins `openDate|closeDate|stock|direction|strategy|strikes|amount|openingPrice|closingPrice` with `|`. Used only by append-mode imports.

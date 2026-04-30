# pnl-tracker

Local-first web app to track stock and options trades and visualize realized P&L by day, week, month, or year.

## Quickstart

```bash
cp .env.example .env
# (optional) edit .env to change Postgres password / timezone
docker compose up --build
```

Open http://localhost:8080.

## Importing trades

1. In your Google Sheet, **File → Download → Comma-separated values (.csv)**.
2. In the app, click **Upload**, drop the CSV, confirm.
3. Each upload is **replace-all** — the entire trade table is wiped and re-imported in a single transaction. Re-uploading the same sheet is safe.

Expected CSV columns (order matters; the second `Strategy` column is the structure, the first is direction):

```
Date | Expiration | Close Date | Stock | Strategy | Strategy | Strikes | Amount | Opening Price | Closing Price | Fees | Profit | Win/Loss | Broker | Bot | Notes
```

Rows with an empty `Close Date` are skipped (closed positions only).

## Local development (without Docker)

```bash
# Postgres
docker compose up postgres -d

# API
cd api
npm install
npx prisma db push   # syncs schema to Postgres
npm run dev          # http://localhost:4000

# Web (in another terminal)
cd web
npm install
npm run dev          # http://localhost:5173, proxies /api → :4000
```

## Tests

API integration tests live in `api/tests/` and run against a real Postgres in an isolated `test` schema (your production data in the `public` schema is untouched).

```bash
docker compose up -d postgres   # ensure Postgres is reachable
cd api
npm install
npm test                         # one-shot run
npm run test:watch               # watch mode
```

Override the DB URL with `DATABASE_URL_TEST` if your Postgres lives elsewhere.

## Stack

Node 20 / Express / Prisma / Postgres 16 / React 18 / Vite / Tailwind / Recharts

## Google Sheets sync (optional)

To enable the "Sync from Google Sheets" button:

1. **Create a service account** in Google Cloud Console (any project; the Sheets API is free).
2. **Generate a JSON key** for the service account and save it at `./credentials/google.json`.
3. **Share your trade sheet** with the service account's email (Viewer access is enough). The email looks like `name@project-id.iam.gserviceaccount.com`.
4. **Set in `.env`:**
   - `GOOGLE_SHEET_ID` — the long ID from the sheet URL
   - `GOOGLE_SHEET_RANGE` — e.g. `Trades!A:P` if your tab is named "Trades"; defaults to `A:P` (first sheet)
5. `docker compose up -d --build api` to pick up the change.

The Upload page will show a "Sync now" button with replace/append modes. Sheet imports show up in the import history alongside CSV uploads.

## Import history

Every upload or sync creates an `ImportBatch` row. The Upload page lists recent imports with an Undo button — clicking it deletes that batch's trades (cascade), letting you revert mistakes without restoring from a backup.

## Backups

Nightly `pg_dump`s land in `./backups/` (mounted into the `backup` service). Defaults: 7 daily, 4 weekly, 6 monthly. Tune via `BACKUP_SCHEDULE`, `BACKUP_KEEP_*` in `.env`.

Restore:
```bash
gunzip -c ./backups/daily/pnl-YYYY-MM-DD.sql.gz \
  | docker compose exec -T postgres psql -U pnl -d pnl
```

## Deploying to AWS

The `docker-compose.yml` is the source of truth for deployment topology. To run on ECS/Fargate or EC2, point each service at a managed Postgres (RDS) by overriding `DATABASE_URL`. No code changes required.

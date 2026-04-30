export type Period = "day" | "week" | "month" | "year";

export interface Filters {
  stock?: string;
  strategy?: string;
  direction?: string;
  broker?: string;
  bot?: boolean;
  from?: string;
  to?: string;
}

export interface BucketTrade {
  stock: string;
  direction: string;
  strategy: string;
  profit: number;
  amount: number;
  winLoss: string;
}

export interface PnlBucket {
  bucket: string;
  profit: number;
  tradeCount: number;
  trades: BucketTrade[];
}

export interface StrategySummary {
  direction: string;
  strategy: string;
  totalProfit: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface SummaryStats {
  totalProfit: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgProfit: number;
  avgWin: number;
  avgLoss: number;
  grossWin: number;
  grossLoss: number;
  profitFactor: number | null;
  expectancy: number;
}

export type ImportMode = "replace" | "append";

export interface Trade {
  id: number;
  openDate: string;
  expiration: string | null;
  closeDate: string;
  stock: string;
  direction: string;
  strategy: string;
  strikes: string | null;
  amount: number;
  openingPrice: string;
  closingPrice: string;
  fees: string;
  profit: string;
  winLoss: string;
  broker: string | null;
  bot: boolean;
  notes: string | null;
}

export interface TradesResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Trade[];
}

export interface Facets {
  stocks: string[];
  strategies: string[];
  directions: string[];
  brokers: string[];
}

export interface ImportResult {
  mode: ImportMode;
  inserted: number;
  skipped: number;
  duplicatesSkipped: number;
  batchId: number | null;
  errors: { row: number; reason: string }[];
}

export interface ImportBatch {
  id: number;
  filename: string | null;
  mode: ImportMode;
  source: "upload" | "sheet";
  rowsInserted: number;
  rowsRemaining: number;
  importedAt: string;
}

export interface SheetSyncStatus {
  configured: boolean;
  sheetId: string | null;
}

export interface DowSummary {
  dow: number;
  profit: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface HoldingPeriodPoint {
  days: number;
  profit: number;
  closeDate: string;
  stock: string;
  direction: string;
  strategy: string;
  winLoss: string;
}

export interface StreakStats {
  currentStreak: { type: "W" | "L" | "none"; length: number };
  longestWin: number;
  longestLoss: number;
  avgWinStreak: number;
  avgLossStreak: number;
  totalWinStreaks: number;
  totalLossStreaks: number;
}

export interface ExtremesResult {
  limit: number;
  totalProfit: number;
  tradeCount: number;
  withoutWorstN: number;
  withoutBestN: number;
  winners: Trade[];
  losers: Trade[];
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  summary: (filters: Filters) =>
    getJson<SummaryStats>(`/api/pnl/summary${qs({ ...filters })}`),
  series: (period: Period, filters: Filters) =>
    getJson<PnlBucket[]>(`/api/pnl/series${qs({ period, ...filters })}`),
  strategies: (filters: Filters) =>
    getJson<StrategySummary[]>(`/api/pnl/strategies${qs({ ...filters })}`),
  trades: (filters: Filters & { page?: number; pageSize?: number }) =>
    getJson<TradesResponse>(`/api/trades${qs({ ...filters })}`),
  facets: () => getJson<Facets>(`/api/trades/facets`),
  upload: async (file: File, mode: ImportMode): Promise<ImportResult> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", mode);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || `${res.status}`);
    return body;
  },
  imports: () => getJson<ImportBatch[]>(`/api/imports`),
  rollbackImport: async (id: number): Promise<void> => {
    const res = await fetch(`/api/imports/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || `${res.status}`);
    }
  },
  syncStatus: () => getJson<SheetSyncStatus>(`/api/sync/status`),
  sync: async (mode: ImportMode): Promise<ImportResult> => {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || `${res.status}`);
    return body;
  },
  extremes: (filters: Filters & { limit?: number }) =>
    getJson<ExtremesResult>(`/api/trades/extremes${qs({ ...filters })}`),
  dow: (filters: Filters) =>
    getJson<DowSummary[]>(`/api/pnl/by-dow${qs({ ...filters })}`),
  holdingPeriod: (filters: Filters) =>
    getJson<HoldingPeriodPoint[]>(`/api/pnl/holding-period${qs({ ...filters })}`),
  streaks: (filters: Filters) =>
    getJson<StreakStats>(`/api/pnl/streaks${qs({ ...filters })}`),
};

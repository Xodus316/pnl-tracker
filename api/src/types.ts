export type Period = "day" | "week" | "month" | "year";

export interface ParsedTrade {
  openDate: Date;
  expiration: Date | null;
  closeDate: Date;
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

export type ImportMode = "replace" | "append";

export interface ImportResult {
  mode: ImportMode;
  inserted: number;
  skipped: number;
  duplicatesSkipped: number;
  batchId: number | null;
  errors: { row: number; reason: string }[];
}

export interface TradeFilters {
  stock?: string;
  strategy?: string;
  direction?: string;
  broker?: string;
  bot?: boolean;
  from?: Date;
  to?: Date;
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

export interface DowSummary {
  dow: number; // 1=Mon..7=Sun (ISO)
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

export interface StrategySummary {
  direction: string;
  strategy: string;
  totalProfit: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

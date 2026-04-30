import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type {
  DowSummary,
  HoldingPeriodPoint,
  Period,
  PnlBucket,
  StreakStats,
  StrategySummary,
  TradeFilters,
} from "../types";

const PERIODS: Record<Period, string> = {
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};

function buildWhereSql(filters: TradeFilters): Prisma.Sql {
  const conds: Prisma.Sql[] = [];
  if (filters.from) conds.push(Prisma.sql`"closeDate" >= ${filters.from}::date`);
  if (filters.to) conds.push(Prisma.sql`"closeDate" <= ${filters.to}::date`);
  if (filters.stock) conds.push(Prisma.sql`stock = ${filters.stock}`);
  if (filters.strategy) conds.push(Prisma.sql`strategy = ${filters.strategy}`);
  if (filters.direction)
    conds.push(Prisma.sql`direction = ${filters.direction}`);
  if (filters.broker) conds.push(Prisma.sql`broker = ${filters.broker}`);
  if (typeof filters.bot === "boolean")
    conds.push(Prisma.sql`bot = ${filters.bot}`);

  if (conds.length === 0) return Prisma.sql`TRUE`;
  return Prisma.join(conds, " AND ");
}

export async function pnlSeries(
  period: Period,
  filters: TradeFilters,
): Promise<PnlBucket[]> {
  const trunc = PERIODS[period];
  const where = buildWhereSql(filters);

  const rows = await prisma.$queryRaw<
    {
      bucket: Date;
      profit: string;
      trade_count: bigint;
      trades: {
        stock: string;
        direction: string;
        strategy: string;
        profit: string;
        amount: number;
        winLoss: string;
      }[];
    }[]
  >(Prisma.sql`
    SELECT
      date_trunc(${trunc}, "closeDate")::date AS bucket,
      SUM(profit)::text AS profit,
      COUNT(*) AS trade_count,
      json_agg(
        json_build_object(
          'stock', stock,
          'direction', direction,
          'strategy', strategy,
          'profit', profit::text,
          'amount', amount,
          'winLoss', "winLoss"
        )
        ORDER BY profit DESC
      ) AS trades
    FROM trades
    WHERE ${where}
    GROUP BY bucket
    ORDER BY bucket ASC
  `);

  return rows.map((r) => ({
    bucket: r.bucket.toISOString().slice(0, 10),
    profit: Number(r.profit),
    tradeCount: Number(r.trade_count),
    trades: (r.trades ?? []).map((t) => ({
      stock: t.stock,
      direction: t.direction,
      strategy: t.strategy,
      profit: Number(t.profit),
      amount: t.amount,
      winLoss: t.winLoss,
    })),
  }));
}

export async function strategyBreakdown(
  filters: TradeFilters,
): Promise<StrategySummary[]> {
  const where = buildWhereSql(filters);

  const rows = await prisma.$queryRaw<
    {
      direction: string;
      strategy: string;
      total_profit: string;
      trades: bigint;
      wins: bigint;
      losses: bigint;
    }[]
  >(Prisma.sql`
    SELECT
      direction,
      strategy,
      SUM(profit)::text AS total_profit,
      COUNT(*) AS trades,
      SUM(CASE WHEN "winLoss" = 'W' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN "winLoss" = 'L' THEN 1 ELSE 0 END) AS losses
    FROM trades
    WHERE ${where}
    GROUP BY direction, strategy
    ORDER BY total_profit DESC
  `);

  return rows.map((r) => {
    const trades = Number(r.trades);
    const wins = Number(r.wins);
    return {
      direction: r.direction,
      strategy: r.strategy,
      totalProfit: Number(r.total_profit),
      trades,
      wins,
      losses: Number(r.losses),
      winRate: trades > 0 ? wins / trades : 0,
    };
  });
}

export async function summary(filters: TradeFilters): Promise<{
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
}> {
  const where = buildWhereSql(filters);
  const rows = await prisma.$queryRaw<
    {
      total_profit: string | null;
      trades: bigint;
      wins: bigint;
      losses: bigint;
      gross_win: string | null;
      gross_loss: string | null;
    }[]
  >(Prisma.sql`
    SELECT
      SUM(profit)::text AS total_profit,
      COUNT(*) AS trades,
      SUM(CASE WHEN "winLoss" = 'W' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN "winLoss" = 'L' THEN 1 ELSE 0 END) AS losses,
      SUM(CASE WHEN "winLoss" = 'W' THEN profit ELSE 0 END)::text AS gross_win,
      SUM(CASE WHEN "winLoss" = 'L' THEN profit ELSE 0 END)::text AS gross_loss
    FROM trades
    WHERE ${where}
  `);
  const r = rows[0];
  const trades = Number(r?.trades ?? 0);
  const totalProfit = Number(r?.total_profit ?? 0);
  const wins = Number(r?.wins ?? 0);
  const losses = Number(r?.losses ?? 0);
  const grossWin = Number(r?.gross_win ?? 0);
  const grossLoss = Number(r?.gross_loss ?? 0);
  const winRate = trades > 0 ? wins / trades : 0;
  const lossRate = trades > 0 ? losses / trades : 0;
  const avgWin = wins > 0 ? grossWin / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const profitFactor = grossLoss !== 0 ? grossWin / Math.abs(grossLoss) : null;
  const expectancy = winRate * avgWin + lossRate * avgLoss;
  return {
    totalProfit,
    trades,
    wins,
    losses,
    winRate,
    avgProfit: trades > 0 ? totalProfit / trades : 0,
    avgWin,
    avgLoss,
    grossWin,
    grossLoss,
    profitFactor,
    expectancy,
  };
}

export async function dowBreakdown(
  filters: TradeFilters,
): Promise<DowSummary[]> {
  const where = buildWhereSql(filters);
  const rows = await prisma.$queryRaw<
    {
      dow: number;
      profit: string;
      trades: bigint;
      wins: bigint;
      losses: bigint;
    }[]
  >(Prisma.sql`
    SELECT
      EXTRACT(ISODOW FROM "closeDate")::int AS dow,
      SUM(profit)::text AS profit,
      COUNT(*) AS trades,
      SUM(CASE WHEN "winLoss" = 'W' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN "winLoss" = 'L' THEN 1 ELSE 0 END) AS losses
    FROM trades
    WHERE ${where}
    GROUP BY dow
    ORDER BY dow ASC
  `);

  // Fill missing days with zeros so the chart always has 7 columns
  const byDow = new Map<number, DowSummary>();
  for (const r of rows) {
    const trades = Number(r.trades);
    const wins = Number(r.wins);
    byDow.set(r.dow, {
      dow: r.dow,
      profit: Number(r.profit),
      trades,
      wins,
      losses: Number(r.losses),
      winRate: trades > 0 ? wins / trades : 0,
    });
  }
  const out: DowSummary[] = [];
  for (let d = 1; d <= 7; d++) {
    out.push(
      byDow.get(d) ?? {
        dow: d,
        profit: 0,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
      },
    );
  }
  return out;
}

export async function holdingPeriodPoints(
  filters: TradeFilters,
): Promise<HoldingPeriodPoint[]> {
  const where = buildWhereSql(filters);
  const rows = await prisma.$queryRaw<
    {
      days: number;
      profit: string;
      close_date: Date;
      stock: string;
      direction: string;
      strategy: string;
      win_loss: string;
    }[]
  >(Prisma.sql`
    SELECT
      ("closeDate" - "openDate")::int AS days,
      profit::text AS profit,
      "closeDate" AS close_date,
      stock,
      direction,
      strategy,
      "winLoss" AS win_loss
    FROM trades
    WHERE ${where}
    ORDER BY "closeDate" ASC
  `);
  return rows.map((r) => ({
    days: Number(r.days),
    profit: Number(r.profit),
    closeDate: r.close_date.toISOString().slice(0, 10),
    stock: r.stock,
    direction: r.direction,
    strategy: r.strategy,
    winLoss: r.win_loss,
  }));
}

export async function streaks(filters: TradeFilters): Promise<StreakStats> {
  const where = buildWhereSql(filters);
  const rows = await prisma.$queryRaw<{ win_loss: string }[]>(Prisma.sql`
    SELECT "winLoss" AS win_loss
    FROM trades
    WHERE ${where}
    ORDER BY "closeDate" ASC, id ASC
  `);

  let longestWin = 0;
  let longestLoss = 0;
  let winStreaks = 0;
  let lossStreaks = 0;
  let winStreakSum = 0;
  let lossStreakSum = 0;
  let curType: "W" | "L" | "none" = "none";
  let curLen = 0;

  function flush() {
    if (curLen === 0) return;
    if (curType === "W") {
      winStreaks++;
      winStreakSum += curLen;
      longestWin = Math.max(longestWin, curLen);
    } else if (curType === "L") {
      lossStreaks++;
      lossStreakSum += curLen;
      longestLoss = Math.max(longestLoss, curLen);
    }
  }

  for (const r of rows) {
    const t: "W" | "L" = r.win_loss === "W" ? "W" : "L";
    if (t === curType) {
      curLen++;
    } else {
      flush();
      curType = t;
      curLen = 1;
    }
  }
  flush();

  return {
    currentStreak: {
      type: rows.length === 0 ? "none" : curType,
      length: rows.length === 0 ? 0 : curLen,
    },
    longestWin,
    longestLoss,
    avgWinStreak: winStreaks > 0 ? winStreakSum / winStreaks : 0,
    avgLossStreak: lossStreaks > 0 ? lossStreakSum / lossStreaks : 0,
    totalWinStreaks: winStreaks,
    totalLossStreaks: lossStreaks,
  };
}

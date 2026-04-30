import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/db";

export const SAMPLE_CSV = [
  "Date,Expiration,Close Date,Stock,Strategy,Strategy,Strikes,Amount,Opening Price,Closing Price,Fees,Profit,Win/Loss,Broker,Bot,Notes",
  // Winning short put vertical
  "1/2/2026,1/9/2026,1/2/2026,SPX,Short,Put Vertical,4700p/4690p,2,150,-50,-2.5,97.5,1,Tastyworks,FALSE,",
  // Losing short call vertical
  "1/3/2026,1/10/2026,1/3/2026,SPX,Short,Call Vertical,4800c/4810c,2,140,-200,-2.5,-62.5,0,Tastyworks,FALSE,bad fill",
  // Winning long iron condor
  "1/5/2026,1/12/2026,1/5/2026,/ES,Long,Iron Condor,4700p/4690p/4800c/4810c,1,100,200,-3,97,1,Tastyworks,TRUE,",
  // Losing long iron condor (bot)
  "1/6/2026,1/13/2026,1/6/2026,SPY,Long,Iron Condor,470p/465p/485c/490c,3,50,-100,-1.2,-51.2,0,Tastyworks,TRUE,",
  // Big winner — outlier
  "2/1/2026,2/8/2026,2/2/2026,SPX,Short,Put Vertical,4500p/4490p,1,800,0,-1,799,1,Tastyworks,FALSE,",
  // Big loser — outlier
  "3/1/2026,3/8/2026,3/2/2026,SPX,Long,Call Vertical,4900c/4910c,5,500,0,-2.5,-502.5,0,Tastyworks,FALSE,",
  // Open position (no close date) — should be skipped
  "3/15/2026,3/22/2026,,SPY,Short,Put Vertical,470p/465p,1,80,,,,,,FALSE,",
].join("\n");

export const EXPECTED_INSERTED = 6;
export const EXPECTED_SKIPPED = 1;

export interface SeedTrade {
  openDate: string; // YYYY-MM-DD
  closeDate: string;
  stock: string;
  direction: "Short" | "Long";
  strategy: string;
  strikes?: string | null;
  amount: number;
  openingPrice: string;
  closingPrice: string;
  fees: string;
  profit: string;
  winLoss: "W" | "L";
  broker?: string | null;
  bot?: boolean;
}

export async function seedTrades(rows: SeedTrade[], batchId?: number) {
  const bid =
    batchId ??
    (
      await prisma.importBatch.create({
        data: {
          mode: "replace",
          source: "upload",
          rowsInserted: rows.length,
          filename: "fixture",
        },
      })
    ).id;
  await prisma.trade.createMany({
    data: rows.map((t) => ({
      openDate: new Date(t.openDate),
      closeDate: new Date(t.closeDate),
      stock: t.stock,
      direction: t.direction,
      strategy: t.strategy,
      strikes: t.strikes ?? null,
      amount: t.amount,
      openingPrice: new Prisma.Decimal(t.openingPrice),
      closingPrice: new Prisma.Decimal(t.closingPrice),
      fees: new Prisma.Decimal(t.fees),
      profit: new Prisma.Decimal(t.profit),
      winLoss: t.winLoss,
      broker: t.broker ?? null,
      bot: t.bot ?? false,
      batchId: bid,
    })),
  });
  return bid;
}

export const BASE_TRADES: SeedTrade[] = [
  {
    openDate: "2026-01-02",
    closeDate: "2026-01-02",
    stock: "SPX",
    direction: "Short",
    strategy: "Put Vertical",
    amount: 2,
    openingPrice: "150",
    closingPrice: "-50",
    fees: "-2.5",
    profit: "97.50",
    winLoss: "W",
    broker: "Tastyworks",
    bot: false,
  },
  {
    openDate: "2026-01-03",
    closeDate: "2026-01-03",
    stock: "SPX",
    direction: "Short",
    strategy: "Call Vertical",
    amount: 2,
    openingPrice: "140",
    closingPrice: "-200",
    fees: "-2.5",
    profit: "-62.50",
    winLoss: "L",
    broker: "Tastyworks",
    bot: false,
  },
  {
    openDate: "2026-01-05",
    closeDate: "2026-01-05",
    stock: "/ES",
    direction: "Long",
    strategy: "Iron Condor",
    amount: 1,
    openingPrice: "100",
    closingPrice: "200",
    fees: "-3",
    profit: "97.00",
    winLoss: "W",
    broker: "Tastyworks",
    bot: true,
  },
  {
    openDate: "2026-02-01",
    closeDate: "2026-02-02",
    stock: "SPX",
    direction: "Short",
    strategy: "Put Vertical",
    amount: 1,
    openingPrice: "800",
    closingPrice: "0",
    fees: "-1",
    profit: "799.00",
    winLoss: "W",
    broker: "Tastyworks",
    bot: false,
  },
  {
    openDate: "2026-03-01",
    closeDate: "2026-03-02",
    stock: "SPX",
    direction: "Long",
    strategy: "Call Vertical",
    amount: 5,
    openingPrice: "500",
    closingPrice: "0",
    fees: "-2.5",
    profit: "-502.50",
    winLoss: "L",
    broker: "Tastyworks",
    bot: false,
  },
];

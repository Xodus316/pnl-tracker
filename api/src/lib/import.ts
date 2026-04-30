import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { dedupKey } from "./csv";
import type { ImportMode, ImportResult, ParsedTrade } from "../types";

function tradeData(t: ParsedTrade, batchId: number) {
  return {
    openDate: t.openDate,
    expiration: t.expiration,
    closeDate: t.closeDate,
    stock: t.stock,
    direction: t.direction,
    strategy: t.strategy,
    strikes: t.strikes,
    amount: t.amount,
    openingPrice: new Prisma.Decimal(t.openingPrice),
    closingPrice: new Prisma.Decimal(t.closingPrice),
    fees: new Prisma.Decimal(t.fees),
    profit: new Prisma.Decimal(t.profit),
    winLoss: t.winLoss,
    broker: t.broker,
    bot: t.bot,
    notes: t.notes,
    batchId,
  };
}

export async function persistImport(opts: {
  trades: ParsedTrade[];
  mode: ImportMode;
  source: "upload" | "sheet";
  filename: string | null;
  baseResult: ImportResult;
}): Promise<ImportResult> {
  const { trades, mode, source, filename, baseResult } = opts;
  const result: ImportResult = { ...baseResult, mode };

  if (mode === "replace") {
    const batchId = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`TRUNCATE TABLE trades, import_batches RESTART IDENTITY`;
      const batch = await tx.importBatch.create({
        data: {
          filename,
          mode,
          source,
          rowsInserted: trades.length,
        },
      });
      if (trades.length > 0) {
        await tx.trade.createMany({
          data: trades.map((t) => tradeData(t, batch.id)),
        });
      }
      return batch.id;
    });
    result.batchId = batchId;
    return result;
  }

  // append + dedup
  const existing = await prisma.trade.findMany({
    select: {
      openDate: true,
      closeDate: true,
      stock: true,
      direction: true,
      strategy: true,
      strikes: true,
      amount: true,
      openingPrice: true,
      closingPrice: true,
    },
  });
  const seen = new Set(
    existing.map((t) =>
      [
        t.openDate.toISOString().slice(0, 10),
        t.closeDate.toISOString().slice(0, 10),
        t.stock,
        t.direction,
        t.strategy,
        t.strikes ?? "",
        t.amount,
        t.openingPrice.toString(),
        t.closingPrice.toString(),
      ].join("|"),
    ),
  );

  const toInsert: ParsedTrade[] = [];
  let dupes = 0;
  for (const t of trades) {
    const key = dedupKey(t);
    if (seen.has(key)) {
      dupes++;
      continue;
    }
    seen.add(key);
    toInsert.push(t);
  }

  const batchId = await prisma.$transaction(async (tx) => {
    const batch = await tx.importBatch.create({
      data: {
        filename,
        mode,
        source,
        rowsInserted: toInsert.length,
      },
    });
    if (toInsert.length > 0) {
      await tx.trade.createMany({
        data: toInsert.map((t) => tradeData(t, batch.id)),
      });
    }
    return batch.id;
  });

  result.inserted = toInsert.length;
  result.duplicatesSkipped = dupes;
  result.batchId = batchId;
  return result;
}

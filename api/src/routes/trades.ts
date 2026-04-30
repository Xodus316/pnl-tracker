import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/db";

export const tradesRouter = Router();

const querySchema = z.object({
  stock: z.string().optional(),
  strategy: z.string().optional(),
  direction: z.string().optional(),
  broker: z.string().optional(),
  bot: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v == null ? undefined : v === "true")),
  from: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  to: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  page: z
    .string()
    .optional()
    .default("1")
    .transform((v) => Math.max(1, parseInt(v, 10) || 1)),
  pageSize: z
    .string()
    .optional()
    .default("50")
    .transform((v) =>
      Math.max(1, Math.min(500, parseInt(v, 10) || 50)),
    ),
});

tradesRouter.get("/", async (req, res, next) => {
  try {
    const q = querySchema.parse(req.query);
    const where: Prisma.TradeWhereInput = {};
    if (q.stock) where.stock = q.stock;
    if (q.strategy) where.strategy = q.strategy;
    if (q.direction) where.direction = q.direction;
    if (q.broker) where.broker = q.broker;
    if (typeof q.bot === "boolean") where.bot = q.bot;
    if (q.from || q.to) {
      where.closeDate = {};
      if (q.from) where.closeDate.gte = q.from;
      if (q.to) where.closeDate.lte = q.to;
    }

    const [total, items] = await Promise.all([
      prisma.trade.count({ where }),
      prisma.trade.findMany({
        where,
        orderBy: [{ closeDate: "desc" }, { id: "desc" }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);

    res.json({
      page: q.page,
      pageSize: q.pageSize,
      total,
      items: items.map((t) => ({
        ...t,
        openingPrice: t.openingPrice.toString(),
        closingPrice: t.closingPrice.toString(),
        fees: t.fees.toString(),
        profit: t.profit.toString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

const extremesSchema = z.object({
  stock: z.string().optional(),
  strategy: z.string().optional(),
  direction: z.string().optional(),
  broker: z.string().optional(),
  bot: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v == null ? undefined : v === "true")),
  from: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  to: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  limit: z
    .string()
    .optional()
    .default("10")
    .transform((v) => Math.max(1, Math.min(50, parseInt(v, 10) || 10))),
});

tradesRouter.get("/extremes", async (req, res, next) => {
  try {
    const q = extremesSchema.parse(req.query);
    const where: Prisma.TradeWhereInput = {};
    if (q.stock) where.stock = q.stock;
    if (q.strategy) where.strategy = q.strategy;
    if (q.direction) where.direction = q.direction;
    if (q.broker) where.broker = q.broker;
    if (typeof q.bot === "boolean") where.bot = q.bot;
    if (q.from || q.to) {
      where.closeDate = {};
      if (q.from) where.closeDate.gte = q.from;
      if (q.to) where.closeDate.lte = q.to;
    }

    const [winners, losers, all] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: [{ profit: "desc" }, { id: "desc" }],
        take: q.limit,
      }),
      prisma.trade.findMany({
        where,
        orderBy: [{ profit: "asc" }, { id: "desc" }],
        take: q.limit,
      }),
      prisma.trade.findMany({
        where,
        select: { profit: true },
      }),
    ]);

    const totalProfit = all.reduce((acc, t) => acc + Number(t.profit), 0);
    const sortedAsc = [...all]
      .map((t) => Number(t.profit))
      .sort((a, b) => a - b);
    const worstSum = sortedAsc.slice(0, q.limit).reduce((a, b) => a + b, 0);
    const bestSum = sortedAsc
      .slice(-q.limit)
      .reduce((a, b) => a + b, 0);

    const serialize = (t: typeof winners[number]) => ({
      ...t,
      openingPrice: t.openingPrice.toString(),
      closingPrice: t.closingPrice.toString(),
      fees: t.fees.toString(),
      profit: t.profit.toString(),
    });

    res.json({
      limit: q.limit,
      totalProfit,
      tradeCount: all.length,
      withoutWorstN: totalProfit - worstSum,
      withoutBestN: totalProfit - bestSum,
      winners: winners.map(serialize),
      losers: losers.map(serialize),
    });
  } catch (err) {
    next(err);
  }
});

tradesRouter.get("/facets", async (_req, res, next) => {
  try {
    const [stocks, strategies, directions, brokers] = await Promise.all([
      prisma.trade.findMany({
        distinct: ["stock"],
        select: { stock: true },
        orderBy: { stock: "asc" },
      }),
      prisma.trade.findMany({
        distinct: ["strategy"],
        select: { strategy: true },
        orderBy: { strategy: "asc" },
      }),
      prisma.trade.findMany({
        distinct: ["direction"],
        select: { direction: true },
        orderBy: { direction: "asc" },
      }),
      prisma.trade.findMany({
        distinct: ["broker"],
        select: { broker: true },
        orderBy: { broker: "asc" },
      }),
    ]);

    res.json({
      stocks: stocks.map((s) => s.stock),
      strategies: strategies.map((s) => s.strategy),
      directions: directions.map((d) => d.direction),
      brokers: brokers
        .map((b) => b.broker)
        .filter((b): b is string => Boolean(b)),
    });
  } catch (err) {
    next(err);
  }
});

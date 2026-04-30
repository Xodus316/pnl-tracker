import { Router } from "express";
import { z } from "zod";
import {
  dowBreakdown,
  holdingPeriodPoints,
  pnlSeries,
  streaks,
  strategyBreakdown,
  summary,
} from "../lib/pnl";
import type { Period, TradeFilters } from "../types";

export const pnlRouter = Router();

const baseFilters = z.object({
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
});

const seriesSchema = baseFilters.extend({
  period: z.enum(["day", "week", "month", "year"]).default("month"),
});

function toFilters(q: z.infer<typeof baseFilters>): TradeFilters {
  return {
    stock: q.stock,
    strategy: q.strategy,
    direction: q.direction,
    broker: q.broker,
    bot: q.bot,
    from: q.from,
    to: q.to,
  };
}

pnlRouter.get("/series", async (req, res, next) => {
  try {
    const q = seriesSchema.parse(req.query);
    const data = await pnlSeries(q.period as Period, toFilters(q));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

pnlRouter.get("/strategies", async (req, res, next) => {
  try {
    const q = baseFilters.parse(req.query);
    const data = await strategyBreakdown(toFilters(q));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

pnlRouter.get("/summary", async (req, res, next) => {
  try {
    const q = baseFilters.parse(req.query);
    const data = await summary(toFilters(q));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

pnlRouter.get("/by-dow", async (req, res, next) => {
  try {
    const q = baseFilters.parse(req.query);
    const data = await dowBreakdown(toFilters(q));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

pnlRouter.get("/holding-period", async (req, res, next) => {
  try {
    const q = baseFilters.parse(req.query);
    const data = await holdingPeriodPoints(toFilters(q));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

pnlRouter.get("/streaks", async (req, res, next) => {
  try {
    const q = baseFilters.parse(req.query);
    const data = await streaks(toFilters(q));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

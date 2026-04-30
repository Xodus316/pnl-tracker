import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { BASE_TRADES, seedTrades } from "./fixtures";

const app = createApp();

describe("GET /api/pnl/summary", () => {
  it("returns zeros for an empty database", async () => {
    const res = await request(app).get("/api/pnl/summary");
    expect(res.status).toBe(200);
    expect(res.body.trades).toBe(0);
    expect(res.body.totalProfit).toBe(0);
    expect(res.body.winRate).toBe(0);
    expect(res.body.profitFactor).toBeNull();
  });

  it("computes totals, win rate, profit factor, expectancy", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app).get("/api/pnl/summary");
    expect(res.status).toBe(200);

    // 5 trades. 3 wins (97.5, 97, 799), 2 losses (-62.5, -502.5).
    // totalProfit = 428.5
    expect(res.body.trades).toBe(5);
    expect(res.body.wins).toBe(3);
    expect(res.body.losses).toBe(2);
    expect(res.body.totalProfit).toBeCloseTo(428.5, 2);
    expect(res.body.winRate).toBeCloseTo(0.6, 2);

    // grossWin = 993.5, grossLoss = -565
    expect(res.body.grossWin).toBeCloseTo(993.5, 2);
    expect(res.body.grossLoss).toBeCloseTo(-565, 2);

    // profitFactor = 993.5 / 565 ≈ 1.7584
    expect(res.body.profitFactor).toBeCloseTo(1.7584, 3);

    // avgWin = 993.5/3 ≈ 331.17, avgLoss = -565/2 = -282.5
    expect(res.body.avgWin).toBeCloseTo(331.1667, 3);
    expect(res.body.avgLoss).toBeCloseTo(-282.5, 2);

    // expectancy ≈ avgProfit ≈ 85.7
    expect(res.body.expectancy).toBeCloseTo(85.7, 1);
  });

  it("respects filters", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app)
      .get("/api/pnl/summary")
      .query({ stock: "/ES" });
    expect(res.body.trades).toBe(1);
    expect(res.body.totalProfit).toBeCloseTo(97, 2);
  });
});

describe("GET /api/pnl/series", () => {
  it("buckets by month and includes per-bucket trades", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app)
      .get("/api/pnl/series")
      .query({ period: "month" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const byBucket = Object.fromEntries(
      res.body.map((b: { bucket: string; profit: number; trades: unknown[] }) => [
        b.bucket,
        b,
      ]),
    );

    // Jan: 97.5 - 62.5 + 97 = 132
    // Feb: 799
    // Mar: -502.5
    expect(byBucket["2026-01-01"].profit).toBeCloseTo(132, 2);
    expect(byBucket["2026-02-01"].profit).toBeCloseTo(799, 2);
    expect(byBucket["2026-03-01"].profit).toBeCloseTo(-502.5, 2);

    // trades inside Jan bucket
    expect(byBucket["2026-01-01"].tradeCount).toBe(3);
    expect(byBucket["2026-01-01"].trades).toHaveLength(3);
    expect(byBucket["2026-01-01"].trades[0]).toMatchObject({
      stock: expect.any(String),
      direction: expect.any(String),
      strategy: expect.any(String),
      profit: expect.any(Number),
    });
  });

  it("buckets by day", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app)
      .get("/api/pnl/series")
      .query({ period: "day" });
    expect(res.status).toBe(200);
    // Each row in BASE_TRADES has a unique close date
    expect(res.body).toHaveLength(BASE_TRADES.length);
  });

  it("buckets by year", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app)
      .get("/api/pnl/series")
      .query({ period: "year" });
    expect(res.body).toHaveLength(1);
    expect(res.body[0].bucket).toBe("2026-01-01");
    expect(res.body[0].profit).toBeCloseTo(428.5, 2);
  });
});

describe("GET /api/pnl/strategies", () => {
  it("groups by direction + strategy with wins/losses and is sorted by profit desc", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app).get("/api/pnl/strategies");
    expect(res.status).toBe(200);
    expect(res.body[0].totalProfit).toBeGreaterThanOrEqual(
      res.body[res.body.length - 1].totalProfit,
    );

    // Find Short Put Vertical: 2 trades (97.5 + 799 = 896.5), 2W/0L
    const sPV = res.body.find(
      (r: { direction: string; strategy: string }) =>
        r.direction === "Short" && r.strategy === "Put Vertical",
    );
    expect(sPV).toBeDefined();
    expect(sPV.trades).toBe(2);
    expect(sPV.wins).toBe(2);
    expect(sPV.losses).toBe(0);
    expect(sPV.totalProfit).toBeCloseTo(896.5, 2);
    expect(sPV.winRate).toBeCloseTo(1, 2);

    // Long Iron Condor: 1 trade, 1W
    const lIC = res.body.find(
      (r: { direction: string; strategy: string }) =>
        r.direction === "Long" && r.strategy === "Iron Condor",
    );
    expect(lIC.trades).toBe(1);
    expect(lIC.wins).toBe(1);
  });

  it("respects filters", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app)
      .get("/api/pnl/strategies")
      .query({ direction: "Long" });
    // Long: Iron Condor (1) + Call Vertical (1) = 2 groups
    expect(res.body).toHaveLength(2);
  });
});

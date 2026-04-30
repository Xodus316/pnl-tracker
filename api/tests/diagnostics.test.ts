import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { BASE_TRADES, seedTrades, type SeedTrade } from "./fixtures";

const app = createApp();

describe("GET /api/pnl/by-dow", () => {
  it("returns 7 buckets even when some days have no trades", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app).get("/api/pnl/by-dow");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(7);
    expect(res.body.map((r: { dow: number }) => r.dow)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("attributes profit to the correct ISO day-of-week", async () => {
    // 2026-01-02 is a Friday → ISODOW=5
    await seedTrades([
      {
        openDate: "2026-01-02",
        closeDate: "2026-01-02",
        stock: "SPX",
        direction: "Short",
        strategy: "Put Vertical",
        amount: 1,
        openingPrice: "100",
        closingPrice: "0",
        fees: "-1",
        profit: "99",
        winLoss: "W",
      },
    ]);
    const res = await request(app).get("/api/pnl/by-dow");
    const friday = res.body.find((r: { dow: number }) => r.dow === 5);
    expect(friday.trades).toBe(1);
    expect(friday.profit).toBeCloseTo(99, 2);
    const monday = res.body.find((r: { dow: number }) => r.dow === 1);
    expect(monday.trades).toBe(0);
  });
});

describe("GET /api/pnl/holding-period", () => {
  it("returns one point per trade with days = closeDate - openDate", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app).get("/api/pnl/holding-period");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(BASE_TRADES.length);
    for (const point of res.body) {
      expect(point).toMatchObject({
        days: expect.any(Number),
        profit: expect.any(Number),
        closeDate: expect.any(String),
        stock: expect.any(String),
        direction: expect.any(String),
        strategy: expect.any(String),
      });
    }
  });

  it("computes days correctly", async () => {
    const trade: SeedTrade = {
      openDate: "2026-01-01",
      closeDate: "2026-01-08",
      stock: "SPX",
      direction: "Short",
      strategy: "Put Vertical",
      amount: 1,
      openingPrice: "100",
      closingPrice: "0",
      fees: "-1",
      profit: "99",
      winLoss: "W",
    };
    await seedTrades([trade]);
    const res = await request(app).get("/api/pnl/holding-period");
    expect(res.body[0].days).toBe(7);
  });
});

describe("GET /api/pnl/streaks", () => {
  it("returns zero state for empty DB", async () => {
    const res = await request(app).get("/api/pnl/streaks");
    expect(res.status).toBe(200);
    expect(res.body.currentStreak).toEqual({ type: "none", length: 0 });
    expect(res.body.longestWin).toBe(0);
    expect(res.body.longestLoss).toBe(0);
  });

  it("computes streaks across a known sequence", async () => {
    // Build W,W,W,L,L,W,L,L,L (closeDate ASC → process order)
    const seq: ("W" | "L")[] = ["W", "W", "W", "L", "L", "W", "L", "L", "L"];
    const rows: SeedTrade[] = seq.map((wl, i) => ({
      openDate: `2026-01-${String(i + 1).padStart(2, "0")}`,
      closeDate: `2026-01-${String(i + 1).padStart(2, "0")}`,
      stock: "SPX",
      direction: "Short",
      strategy: "Put Vertical",
      amount: 1,
      openingPrice: "100",
      closingPrice: "0",
      fees: "-1",
      profit: wl === "W" ? "10" : "-10",
      winLoss: wl,
    }));
    await seedTrades(rows);

    const res = await request(app).get("/api/pnl/streaks");
    expect(res.status).toBe(200);
    expect(res.body.longestWin).toBe(3);
    expect(res.body.longestLoss).toBe(3);
    expect(res.body.currentStreak).toEqual({ type: "L", length: 3 });
    expect(res.body.totalWinStreaks).toBe(2); // [W,W,W], [W]
    expect(res.body.totalLossStreaks).toBe(2); // [L,L], [L,L,L]
    expect(res.body.avgWinStreak).toBeCloseTo(2, 5); // (3+1)/2
    expect(res.body.avgLossStreak).toBeCloseTo(2.5, 5); // (2+3)/2
  });
});

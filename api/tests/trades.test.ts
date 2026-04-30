import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { BASE_TRADES, seedTrades } from "./fixtures";

const app = createApp();

describe("GET /api/trades", () => {
  it("returns empty list when no trades", async () => {
    const res = await request(app).get("/api/trades");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.items).toEqual([]);
  });

  it("returns trades sorted by closeDate desc", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app).get("/api/trades");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(BASE_TRADES.length);
    const dates = res.body.items.map((t: { closeDate: string }) =>
      t.closeDate.slice(0, 10),
    );
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });

  it("filters by stock", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app).get("/api/trades").query({ stock: "/ES" });
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].stock).toBe("/ES");
  });

  it("filters by strategy + direction", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app)
      .get("/api/trades")
      .query({ strategy: "Put Vertical", direction: "Short" });
    expect(res.body.total).toBe(2);
  });

  it("filters by bot=true", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app).get("/api/trades").query({ bot: "true" });
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].bot).toBe(true);
  });

  it("filters by closeDate range", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app)
      .get("/api/trades")
      .query({ from: "2026-02-01", to: "2026-02-28" });
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].closeDate.slice(0, 10)).toBe("2026-02-02");
  });

  it("paginates", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app)
      .get("/api/trades")
      .query({ page: 1, pageSize: 2 });
    expect(res.body.total).toBe(BASE_TRADES.length);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(2);
  });
});

describe("GET /api/trades/facets", () => {
  it("returns distinct values across trades", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app).get("/api/trades/facets");
    expect(res.status).toBe(200);
    expect(res.body.stocks).toEqual(expect.arrayContaining(["SPX", "/ES"]));
    expect(res.body.strategies).toEqual(
      expect.arrayContaining(["Put Vertical", "Call Vertical", "Iron Condor"]),
    );
    expect(res.body.directions).toEqual(
      expect.arrayContaining(["Short", "Long"]),
    );
    expect(res.body.brokers).toContain("Tastyworks");
  });
});

describe("GET /api/trades/extremes", () => {
  it("returns top winners, bottom losers, and outlier impact", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app).get("/api/trades/extremes").query({
      limit: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body.tradeCount).toBe(BASE_TRADES.length);

    // Total profit: 97.5 - 62.5 + 97 + 799 - 502.5 = 428.5
    expect(res.body.totalProfit).toBeCloseTo(428.5, 2);

    // Top 2 winners by profit: 799, 97.5 → withoutBestN = 428.5 - (799 + 97.5) = -468
    expect(res.body.withoutBestN).toBeCloseTo(-468, 2);
    // Worst 2: -502.5, -62.5 → withoutWorstN = 428.5 - (-565) = 993.5
    expect(res.body.withoutWorstN).toBeCloseTo(993.5, 2);

    expect(res.body.winners).toHaveLength(2);
    expect(res.body.losers).toHaveLength(2);
    expect(Number(res.body.winners[0].profit)).toBe(799);
    expect(Number(res.body.losers[0].profit)).toBe(-502.5);
  });

  it("respects filters", async () => {
    await seedTrades(BASE_TRADES);
    const res = await request(app).get("/api/trades/extremes").query({
      direction: "Long",
      limit: 5,
    });
    expect(res.body.tradeCount).toBe(2);
  });
});

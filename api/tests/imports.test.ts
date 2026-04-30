import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/db";
import { BASE_TRADES, seedTrades } from "./fixtures";

const app = createApp();

describe("GET /api/imports", () => {
  it("returns empty when no batches", async () => {
    const res = await request(app).get("/api/imports");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("lists batches newest first with rowsRemaining", async () => {
    const batchA = await seedTrades(BASE_TRADES.slice(0, 2));
    const batchB = await seedTrades(BASE_TRADES.slice(2));

    const res = await request(app).get("/api/imports");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe(batchB);
    expect(res.body[1].id).toBe(batchA);
    expect(res.body[0].rowsRemaining).toBe(BASE_TRADES.length - 2);
    expect(res.body[1].rowsRemaining).toBe(2);
  });
});

describe("DELETE /api/imports/:id", () => {
  it("rolls back the batch and cascade-deletes its trades", async () => {
    const batchA = await seedTrades(BASE_TRADES.slice(0, 2));
    const batchB = await seedTrades(BASE_TRADES.slice(2));

    expect(await prisma.trade.count()).toBe(BASE_TRADES.length);

    const res = await request(app).delete(`/api/imports/${batchB}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    expect(await prisma.trade.count()).toBe(2);
    const remainingBatches = await prisma.importBatch.findMany();
    expect(remainingBatches.map((b) => b.id)).toEqual([batchA]);
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).delete("/api/imports/not-a-number");
    expect(res.status).toBe(400);
  });

  it("returns 500-style error for unknown id", async () => {
    const res = await request(app).delete("/api/imports/99999");
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

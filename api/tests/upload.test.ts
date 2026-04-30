import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/db";
import { EXPECTED_INSERTED, EXPECTED_SKIPPED, SAMPLE_CSV } from "./fixtures";

const app = createApp();

describe("POST /api/upload", () => {
  it("rejects when no file is provided", async () => {
    const res = await request(app).post("/api/upload");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing file/i);
  });

  it("imports CSV in replace mode and creates a batch", async () => {
    const res = await request(app)
      .post("/api/upload")
      .field("mode", "replace")
      .attach("file", Buffer.from(SAMPLE_CSV, "utf-8"), "trades.csv");

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("replace");
    expect(res.body.inserted).toBe(EXPECTED_INSERTED);
    expect(res.body.skipped).toBe(EXPECTED_SKIPPED);
    expect(res.body.duplicatesSkipped).toBe(0);
    expect(res.body.batchId).toBeTypeOf("number");

    const count = await prisma.trade.count();
    expect(count).toBe(EXPECTED_INSERTED);

    const batches = await prisma.importBatch.findMany();
    expect(batches).toHaveLength(1);
    expect(batches[0].rowsInserted).toBe(EXPECTED_INSERTED);
    expect(batches[0].source).toBe("upload");
  });

  it("replace mode wipes prior data and prior batches", async () => {
    await request(app)
      .post("/api/upload")
      .field("mode", "replace")
      .attach("file", Buffer.from(SAMPLE_CSV, "utf-8"), "first.csv");

    const second = await request(app)
      .post("/api/upload")
      .field("mode", "replace")
      .attach("file", Buffer.from(SAMPLE_CSV, "utf-8"), "second.csv");

    expect(second.status).toBe(200);
    expect(await prisma.trade.count()).toBe(EXPECTED_INSERTED);
    const batches = await prisma.importBatch.findMany();
    expect(batches).toHaveLength(1);
    expect(batches[0].filename).toBe("second.csv");
  });

  it("append mode adds new rows and skips exact duplicates", async () => {
    await request(app)
      .post("/api/upload")
      .field("mode", "replace")
      .attach("file", Buffer.from(SAMPLE_CSV, "utf-8"), "first.csv");

    const second = await request(app)
      .post("/api/upload")
      .field("mode", "append")
      .attach("file", Buffer.from(SAMPLE_CSV, "utf-8"), "second.csv");

    expect(second.status).toBe(200);
    expect(second.body.mode).toBe("append");
    expect(second.body.inserted).toBe(0);
    expect(second.body.duplicatesSkipped).toBe(EXPECTED_INSERTED);

    expect(await prisma.trade.count()).toBe(EXPECTED_INSERTED);
    expect(await prisma.importBatch.count()).toBe(2);
  });

  it("treats - in price columns as 0", async () => {
    const csv = [
      "Date,Expiration,Close Date,Stock,Strategy,Strategy,Strikes,Amount,Opening Price,Closing Price,Fees,Profit,Win/Loss,Broker,Bot,Notes",
      "1/2/2026,1/9/2026,1/2/2026,SPX,Short,Put Vertical,4700p/4690p,1,-,-,-,0,1,Tastyworks,FALSE,",
    ].join("\n");

    const res = await request(app)
      .post("/api/upload")
      .field("mode", "replace")
      .attach("file", Buffer.from(csv, "utf-8"), "dashes.csv");

    expect(res.status).toBe(200);
    expect(res.body.inserted).toBe(1);
    const t = await prisma.trade.findFirst();
    expect(Number(t?.openingPrice)).toBe(0);
    expect(Number(t?.closingPrice)).toBe(0);
    expect(Number(t?.fees)).toBe(0);
  });

  it("parses Win/Loss as 1=W, 0=L", async () => {
    const csv = [
      "Date,Expiration,Close Date,Stock,Strategy,Strategy,Strikes,Amount,Opening Price,Closing Price,Fees,Profit,Win/Loss,Broker,Bot,Notes",
      "1/2/2026,1/9/2026,1/2/2026,SPX,Short,Call,4800c,1,100,0,-1,99,1,Tastyworks,FALSE,",
      "1/3/2026,1/10/2026,1/3/2026,SPX,Short,Call,4800c,1,100,200,-1,-101,0,Tastyworks,FALSE,",
    ].join("\n");

    const res = await request(app)
      .post("/api/upload")
      .field("mode", "replace")
      .attach("file", Buffer.from(csv, "utf-8"), "wl.csv");

    expect(res.status).toBe(200);
    const trades = await prisma.trade.findMany({ orderBy: { id: "asc" } });
    expect(trades.map((t) => t.winLoss)).toEqual(["W", "L"]);
  });
});

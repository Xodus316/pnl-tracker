import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/db";
import { SAMPLE_CSV, EXPECTED_INSERTED } from "./fixtures";

vi.mock("../src/lib/sheets", () => ({
  isSheetsConfigured: vi.fn(),
  getSheetsConfig: vi.fn(),
  fetchSheetRows: vi.fn(),
}));

import * as sheets from "../src/lib/sheets";

const csvToRows = (csv: string): string[][] =>
  csv.split("\n").map((line) => line.split(","));

const app = createApp();

describe("GET /api/sync/status", () => {
  beforeEach(() => {
    vi.mocked(sheets.isSheetsConfigured).mockReset();
  });

  it("returns configured=false when not set", async () => {
    vi.mocked(sheets.isSheetsConfigured).mockReturnValue(false);
    const prevId = process.env.GOOGLE_SHEET_ID;
    delete process.env.GOOGLE_SHEET_ID;

    const res = await request(app).get("/api/sync/status");
    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(false);
    expect(res.body.sheetId).toBeNull();

    if (prevId !== undefined) process.env.GOOGLE_SHEET_ID = prevId;
  });

  it("returns configured=true when set", async () => {
    vi.mocked(sheets.isSheetsConfigured).mockReturnValue(true);
    process.env.GOOGLE_SHEET_ID = "sheet-abc";

    const res = await request(app).get("/api/sync/status");
    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(true);
    expect(res.body.sheetId).toBe("sheet-abc");

    delete process.env.GOOGLE_SHEET_ID;
  });
});

describe("POST /api/sync", () => {
  beforeEach(() => {
    vi.mocked(sheets.isSheetsConfigured).mockReset();
    vi.mocked(sheets.fetchSheetRows).mockReset();
  });

  afterEach(() => {
    delete process.env.GOOGLE_SHEET_ID;
  });

  it("fails when not configured", async () => {
    vi.mocked(sheets.isSheetsConfigured).mockReturnValue(false);
    const res = await request(app)
      .post("/api/sync")
      .send({ mode: "replace" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not configured/i);
  });

  it("imports rows fetched from the mocked sheet (replace mode)", async () => {
    vi.mocked(sheets.isSheetsConfigured).mockReturnValue(true);
    vi.mocked(sheets.fetchSheetRows).mockResolvedValue(csvToRows(SAMPLE_CSV));
    process.env.GOOGLE_SHEET_ID = "sheet-abc";

    const res = await request(app)
      .post("/api/sync")
      .send({ mode: "replace" });
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("replace");
    expect(res.body.inserted).toBe(EXPECTED_INSERTED);

    const batches = await prisma.importBatch.findMany();
    expect(batches).toHaveLength(1);
    expect(batches[0].source).toBe("sheet");
    expect(batches[0].filename).toBe("sheet:sheet-abc");
    expect(await prisma.trade.count()).toBe(EXPECTED_INSERTED);
  });

  it("dedups in append mode", async () => {
    vi.mocked(sheets.isSheetsConfigured).mockReturnValue(true);
    vi.mocked(sheets.fetchSheetRows).mockResolvedValue(csvToRows(SAMPLE_CSV));
    process.env.GOOGLE_SHEET_ID = "sheet-abc";

    await request(app).post("/api/sync").send({ mode: "replace" });
    const second = await request(app)
      .post("/api/sync")
      .send({ mode: "append" });

    expect(second.status).toBe(200);
    expect(second.body.inserted).toBe(0);
    expect(second.body.duplicatesSkipped).toBe(EXPECTED_INSERTED);
  });

  it("propagates sheet fetch errors", async () => {
    vi.mocked(sheets.isSheetsConfigured).mockReturnValue(true);
    vi.mocked(sheets.fetchSheetRows).mockRejectedValue(
      new Error("permission denied"),
    );
    process.env.GOOGLE_SHEET_ID = "sheet-abc";

    const res = await request(app)
      .post("/api/sync")
      .send({ mode: "replace" });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/permission denied/);
  });
});

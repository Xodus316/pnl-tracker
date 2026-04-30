import { Router } from "express";
import { fetchSheetRows, isSheetsConfigured } from "../lib/sheets";
import { parseRows } from "../lib/csv";
import { persistImport } from "../lib/import";
import type { ImportMode } from "../types";

export const syncRouter = Router();

syncRouter.get("/status", (_req, res) => {
  res.json({
    configured: isSheetsConfigured(),
    sheetId: process.env.GOOGLE_SHEET_ID || null,
  });
});

syncRouter.post("/", async (req, res, next) => {
  try {
    if (!isSheetsConfigured()) {
      return res.status(400).json({ error: "Google Sheets not configured" });
    }
    const mode: ImportMode = req.body?.mode === "append" ? "append" : "replace";

    const rows = await fetchSheetRows();
    const { trades, result: baseResult } = parseRows(rows);

    if (trades.length === 0 && baseResult.errors.length > 0) {
      return res
        .status(400)
        .json({ error: "no valid rows in sheet", ...baseResult, mode });
    }

    const result = await persistImport({
      trades,
      mode,
      source: "sheet",
      filename: `sheet:${process.env.GOOGLE_SHEET_ID}`,
      baseResult,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

import { Router } from "express";
import multer from "multer";
import { parseCsv } from "../lib/csv";
import { persistImport } from "../lib/import";
import type { ImportMode } from "../types";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const uploadRouter = Router();

uploadRouter.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "missing file" });
    }
    const mode: ImportMode = req.body?.mode === "append" ? "append" : "replace";

    const { trades, result: baseResult } = parseCsv(req.file.buffer);

    if (trades.length === 0 && baseResult.errors.length > 0) {
      return res
        .status(400)
        .json({ error: "no valid rows in CSV", ...baseResult, mode });
    }

    const result = await persistImport({
      trades,
      mode,
      source: "upload",
      filename: req.file.originalname || null,
      baseResult,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

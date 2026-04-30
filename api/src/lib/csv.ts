import Papa from "papaparse";
import { parse as parseDate, isValid } from "date-fns";
import type { ImportResult, ParsedTrade } from "../types";

const DATE_FORMATS = ["M/d/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "M/d/yy"];

const COL = {
  openDate: 0,
  expiration: 1,
  closeDate: 2,
  stock: 3,
  direction: 4,
  strategy: 5,
  strikes: 6,
  amount: 7,
  openingPrice: 8,
  closingPrice: 9,
  fees: 10,
  profit: 11,
  winLoss: 12,
  broker: 13,
  bot: 14,
  notes: 15,
} as const;

function tryParseDate(input: string): Date | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  for (const fmt of DATE_FORMATS) {
    const d = parseDate(trimmed, fmt, new Date());
    if (isValid(d)) return d;
  }
  const fallback = new Date(trimmed);
  return isValid(fallback) ? fallback : null;
}

function parseBool(input: string): boolean {
  const v = (input ?? "").trim().toLowerCase();
  return v === "true" || v === "yes" || v === "1" || v === "y";
}

function parseMoney(input: string): string | null {
  if (input == null) return null;
  const cleaned = String(input).replace(/[$,\s]/g, "").trim();
  if (cleaned === "") return null;
  if (cleaned === "-") return "0";
  const wrapped = /^\(.*\)$/.test(cleaned)
    ? "-" + cleaned.slice(1, -1)
    : cleaned;
  const n = Number(wrapped);
  return Number.isFinite(n) ? wrapped : null;
}

function parseInt0(input: string): number | null {
  const cleaned = String(input ?? "").replace(/[,\s]/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export interface ParseOutcome {
  trades: ParsedTrade[];
  result: ImportResult;
}

export function parseCsv(buffer: Buffer): ParseOutcome {
  const text = buffer.toString("utf-8").replace(/^﻿/, "");
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
  });
  return parseRows(parsed.data);
}

export function parseRows(rows: string[][]): ParseOutcome {
  const trades: ParsedTrade[] = [];
  const errors: { row: number; reason: string }[] = [];
  let skipped = 0;

  // Drop header row (first non-empty row)
  const startIdx =
    rows.length > 0 && /date/i.test(rows[0][COL.openDate] ?? "") ? 1 : 0;

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    const sheetRow = i + 1; // 1-based for human-friendly errors

    const closeDate = tryParseDate(row[COL.closeDate] ?? "");
    if (!closeDate) {
      skipped++;
      continue;
    }

    const openDate = tryParseDate(row[COL.openDate] ?? "");
    if (!openDate) {
      errors.push({ row: sheetRow, reason: "missing/invalid open Date" });
      continue;
    }

    const stock = (row[COL.stock] ?? "").trim();
    if (!stock) {
      errors.push({ row: sheetRow, reason: "missing Stock" });
      continue;
    }

    const direction = (row[COL.direction] ?? "").trim();
    const strategy = (row[COL.strategy] ?? "").trim();
    if (!direction || !strategy) {
      errors.push({ row: sheetRow, reason: "missing Strategy fields" });
      continue;
    }

    const amount = parseInt0(row[COL.amount] ?? "");
    if (amount == null) {
      errors.push({ row: sheetRow, reason: "missing/invalid Amount" });
      continue;
    }

    const openingPrice = parseMoney(row[COL.openingPrice] ?? "");
    const closingPrice = parseMoney(row[COL.closingPrice] ?? "");
    const fees = parseMoney(row[COL.fees] ?? "") ?? "0";
    const profit = parseMoney(row[COL.profit] ?? "");
    if (openingPrice == null || closingPrice == null || profit == null) {
      errors.push({ row: sheetRow, reason: "missing/invalid price/profit" });
      continue;
    }

    const rawWl = (row[COL.winLoss] ?? "").trim().toUpperCase();
    let winLoss: "W" | "L";
    if (rawWl === "1" || rawWl === "W" || rawWl.startsWith("WIN")) {
      winLoss = "W";
    } else if (rawWl === "0" || rawWl === "L" || rawWl.startsWith("LOS")) {
      winLoss = "L";
    } else {
      winLoss = Number(profit) > 0 ? "W" : "L";
    }

    trades.push({
      openDate,
      expiration: tryParseDate(row[COL.expiration] ?? ""),
      closeDate,
      stock,
      direction,
      strategy,
      strikes: (row[COL.strikes] ?? "").trim() || null,
      amount,
      openingPrice,
      closingPrice,
      fees,
      profit,
      winLoss,
      broker: (row[COL.broker] ?? "").trim() || null,
      bot: parseBool(row[COL.bot] ?? ""),
      notes: (row[COL.notes] ?? "").trim() || null,
    });
  }

  return {
    trades,
    result: {
      mode: "replace",
      inserted: trades.length,
      skipped,
      duplicatesSkipped: 0,
      batchId: null,
      errors,
    },
  };
}

export function dedupKey(t: ParsedTrade): string {
  return [
    t.openDate.toISOString().slice(0, 10),
    t.closeDate.toISOString().slice(0, 10),
    t.stock,
    t.direction,
    t.strategy,
    t.strikes ?? "",
    t.amount,
    t.openingPrice,
    t.closingPrice,
  ].join("|");
}

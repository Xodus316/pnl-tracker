import { google } from "googleapis";

export function isSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      (process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.GOOGLE_CREDENTIALS_JSON),
  );
}

export interface SheetsConfig {
  sheetId: string;
  range: string;
}

export function getSheetsConfig(): SheetsConfig | null {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) return null;
  return {
    sheetId,
    range: process.env.GOOGLE_SHEET_RANGE || "A:P",
  };
}

export async function fetchSheetRows(): Promise<string[][]> {
  const cfg = getSheetsConfig();
  if (!cfg) throw new Error("GOOGLE_SHEET_ID not set");

  const credsJson = process.env.GOOGLE_CREDENTIALS_JSON;
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    ...(credsJson ? { credentials: JSON.parse(credsJson) } : {}),
  });

  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: cfg.sheetId,
    range: cfg.range,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  const rows = (res.data.values ?? []) as unknown[][];
  return rows.map((r) => r.map((c) => (c == null ? "" : String(c))));
}

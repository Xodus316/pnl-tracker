import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ImportMode, type ImportResult } from "../api/client";

export default function SyncFromSheet() {
  const [mode, setMode] = useState<ImportMode>("replace");
  const [result, setResult] = useState<ImportResult | null>(null);
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["sync-status"],
    queryFn: api.syncStatus,
  });

  const sync = useMutation({
    mutationFn: (m: ImportMode) => api.sync(m),
    onSuccess: (r) => {
      setResult(r);
      queryClient.invalidateQueries();
    },
  });

  if (!status) return null;

  if (!status.configured) {
    return (
      <section className="rounded-lg border border-cyber-800 bg-cyber-950/70 px-4 py-3 space-y-2">
        <h2 className="section-heading">Google Sheets sync</h2>
        <p className="text-xs text-cyber-400 leading-relaxed">
          Not configured. To enable:
        </p>
        <ol className="text-xs text-cyber-400 list-decimal pl-5 space-y-1">
          <li>
            Create a Google Cloud service account and download its JSON key.
          </li>
          <li>
            Place the key at{" "}
            <code className="text-cyber-200">./credentials/google.json</code>.
          </li>
          <li>
            Share your sheet with the service account&rsquo;s email (read-only
            is fine).
          </li>
          <li>
            Set{" "}
            <code className="text-cyber-200">GOOGLE_SHEET_ID</code> in{" "}
            <code className="text-cyber-200">.env</code> and rerun{" "}
            <code className="text-cyber-200">docker compose up -d</code>.
          </li>
        </ol>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-cyber-800 bg-cyber-950/70 px-4 py-3 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="section-heading">Google Sheets sync</h2>
        <span className="text-[11px] text-cyber-500 truncate max-w-[60%]">
          sheet: {status.sheetId}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as ImportMode)}
          className="bg-cyber-850 border border-cyber-700 rounded-lg px-2 py-1 text-xs text-cyber-100 focus:outline-none focus:border-neon-cyan/50 transition-all duration-200"
        >
          <option value="replace">Replace all</option>
          <option value="append">Append + dedup</option>
        </select>
        <button
          disabled={sync.isPending}
          onClick={() => sync.mutate(mode)}
          className="px-4 py-1.5 rounded-lg bg-neon-cyan text-cyber-black text-xs font-semibold hover:shadow-neon-cyan disabled:opacity-50 transition-all duration-200"
        >
          {sync.isPending ? "Syncing…" : "Sync now"}
        </button>
      </div>
      {sync.isError && (
        <div className="text-xs text-loss">
          {(sync.error as Error).message}
        </div>
      )}
      {result && (
        <div className="text-xs text-cyber-300">
          <span className="text-profit font-medium">{result.inserted}</span>{" "}
          rows imported ({result.mode})
          {result.duplicatesSkipped > 0 && (
            <>
              {" — "}
              <span className="text-cyber-400">
                {result.duplicatesSkipped} duplicates skipped
              </span>
            </>
          )}
        </div>
      )}
    </section>
  );
}

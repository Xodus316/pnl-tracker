import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ImportMode, type ImportResult } from "../api/client";
import ImportHistory from "../components/ImportHistory";
import SyncFromSheet from "../components/SyncFromSheet";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>("replace");
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: ({ f, m }: { f: File; m: ImportMode }) => api.upload(f, m),
    onSuccess: (r) => {
      setResult(r);
      queryClient.invalidateQueries();
    },
  });

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setFile(files[0]);
    setResult(null);
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-cyber-100">
        Upload trades
      </h1>

      <SyncFromSheet />

      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-[0.15em] text-cyber-400 font-body font-medium mb-1">
          Import mode
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ModeOption
            value="replace"
            current={mode}
            onChange={setMode}
            title="Replace all"
            desc="Wipes existing trades and re-imports. The CSV becomes the source of truth."
          />
          <ModeOption
            value="append"
            current={mode}
            onChange={setMode}
            title="Append + dedup"
            desc="Adds new rows; skips duplicates by open/close date, stock, strategy, strikes, qty, and prices."
          />
        </div>
      </fieldset>

      {mode === "replace" && (
        <div className="rounded-lg border border-neon-amber/30 bg-neon-amber/[0.05] px-4 py-3 text-sm text-neon-amber">
          <strong>Replace-all import.</strong> This wipes the existing trade
          table and re-imports from your CSV in a single transaction.
        </div>
      )}

      <label
        className={`block rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 ${
          dragOver
            ? "border-neon-cyan bg-neon-cyan/[0.03] shadow-neon-cyan"
            : "border-cyber-700 hover:border-neon-cyan/40 bg-cyber-950/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {file ? (
          <div className="space-y-1">
            <div className="font-medium text-cyber-100">{file.name}</div>
            <div className="text-xs text-cyber-400">
              {(file.size / 1024).toFixed(1)} KB — click to replace
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-cyber-400">
            <div className="text-base">Drop a CSV here</div>
            <div className="text-xs">or click to browse</div>
          </div>
        )}
      </label>

      <div className="flex items-center gap-3">
        <button
          disabled={!file || mutation.isPending}
          onClick={() => file && mutation.mutate({ f: file, m: mode })}
          className="px-5 py-2.5 rounded-lg bg-neon-green text-cyber-black font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-neon-green transition-all duration-200"
        >
          {mutation.isPending
            ? "Importing…"
            : mode === "replace"
              ? "Replace all & import"
              : "Append & dedup"}
        </button>
        {file && !mutation.isPending && (
          <button
            onClick={() => {
              setFile(null);
              setResult(null);
            }}
            className="text-sm text-cyber-400 hover:text-neon-cyan transition-colors duration-200"
          >
            Clear
          </button>
        )}
      </div>

      {mutation.isError && (
        <div className="rounded-lg border border-neon-magenta/30 bg-neon-magenta/[0.05] px-4 py-3 text-sm text-neon-magenta">
          {(mutation.error as Error).message}
        </div>
      )}

      {result && (
        <div className="space-y-2 rounded-lg border border-cyber-800 bg-cyber-950/70 px-4 py-3 text-sm">
          <div>
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
            {result.skipped > 0 && (
              <>
                {" — "}
                <span className="text-cyber-400">
                  {result.skipped} rows without close date
                </span>
              </>
            )}
          </div>
          {result.errors.length > 0 && (
            <details className="text-xs text-neon-amber">
              <summary className="cursor-pointer">
                {result.errors.length} row error
                {result.errors.length === 1 ? "" : "s"}
              </summary>
              <ul className="mt-2 space-y-0.5 font-mono">
                {result.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    row {e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <button
            onClick={() => navigate("/")}
            className="mt-2 text-sm text-neon-cyan hover:underline"
          >
            View dashboard →
          </button>
        </div>
      )}

      <ImportHistory />
    </div>
  );
}

function ModeOption({
  value,
  current,
  onChange,
  title,
  desc,
}: {
  value: ImportMode;
  current: ImportMode;
  onChange: (m: ImportMode) => void;
  title: string;
  desc: string;
}) {
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`text-left rounded-lg border px-4 py-3 transition-all duration-200 ${
        selected
          ? "border-neon-cyan/40 bg-neon-cyan/[0.05] shadow-neon-cyan-sm"
          : "border-cyber-800 hover:border-cyber-600 bg-cyber-950/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`inline-block h-3 w-3 rounded-full border ${
            selected ? "border-neon-cyan bg-neon-cyan" : "border-cyber-600"
          }`}
        />
        <span className="font-medium text-sm text-cyber-100">{title}</span>
      </div>
      <div className="text-xs text-cyber-400">{desc}</div>
    </button>
  );
}

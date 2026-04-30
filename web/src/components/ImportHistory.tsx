import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ImportBatch } from "../api/client";
import { format, parseISO } from "date-fns";

export default function ImportHistory() {
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["imports"],
    queryFn: api.imports,
  });

  const rollback = useMutation({
    mutationFn: (id: number) => api.rollbackImport(id),
    onSuccess: () => {
      setConfirmId(null);
      queryClient.invalidateQueries();
    },
  });

  return (
    <section className="space-y-2">
      <h2 className="section-heading">Recent imports</h2>
      {isLoading ? (
        <div className="text-xs text-cyber-500">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="text-xs text-cyber-500 border border-dashed border-cyber-800 rounded-lg px-3 py-3">
          No imports yet.
        </div>
      ) : (
        <div className="rounded-lg border border-cyber-800 bg-cyber-950/70 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-cyber-900 text-cyber-400 uppercase tracking-[0.15em]">
              <tr>
                <th className="text-left px-3 py-2 font-medium">When</th>
                <th className="text-left px-3 py-2 font-medium">Source</th>
                <th className="text-left px-3 py-2 font-medium">Mode</th>
                <th className="text-left px-3 py-2 font-medium">Filename</th>
                <th className="text-right px-3 py-2 font-medium">Inserted</th>
                <th className="text-right px-3 py-2 font-medium">Remaining</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-800">
              {data.map((b) => (
                <BatchRow
                  key={b.id}
                  b={b}
                  isConfirming={confirmId === b.id}
                  onAskConfirm={() => setConfirmId(b.id)}
                  onCancel={() => setConfirmId(null)}
                  onConfirm={() => rollback.mutate(b.id)}
                  pending={rollback.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rollback.isError && (
        <div className="text-xs text-loss">
          {(rollback.error as Error).message}
        </div>
      )}
    </section>
  );
}

function BatchRow({
  b,
  isConfirming,
  onAskConfirm,
  onCancel,
  onConfirm,
  pending,
}: {
  b: ImportBatch;
  isConfirming: boolean;
  onAskConfirm: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <tr className="hover:bg-neon-cyan/[0.03] transition-colors duration-200">
      <td className="px-3 py-1.5 tabular-nums text-cyber-300">
        {format(parseISO(b.importedAt), "yyyy-MM-dd HH:mm")}
      </td>
      <td className="px-3 py-1.5 text-cyber-400">{b.source}</td>
      <td className="px-3 py-1.5">
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
            b.mode === "replace"
              ? "bg-neon-amber/15 text-neon-amber"
              : "bg-neon-blue/15 text-neon-blue"
          }`}
        >
          {b.mode}
        </span>
      </td>
      <td className="px-3 py-1.5 text-cyber-400 truncate max-w-[260px]">
        {b.filename ?? "—"}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">{b.rowsInserted}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-cyber-400">
        {b.rowsRemaining}
      </td>
      <td className="px-3 py-1.5 text-right">
        {isConfirming ? (
          <span className="inline-flex gap-2 items-center">
            <span className="text-loss">Delete {b.rowsRemaining} rows?</span>
            <button
              disabled={pending}
              onClick={onConfirm}
              className="px-2 py-0.5 rounded bg-neon-magenta text-white text-[11px] font-medium hover:shadow-neon-magenta disabled:opacity-50 transition-all duration-200"
            >
              {pending ? "…" : "Confirm"}
            </button>
            <button
              onClick={onCancel}
              className="px-2 py-0.5 rounded text-[11px] text-cyber-400 hover:text-neon-cyan transition-colors duration-200"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={onAskConfirm}
            className="px-2 py-0.5 rounded text-[11px] text-cyber-400 border border-cyber-700 hover:border-neon-magenta/40 hover:text-neon-magenta transition-all duration-200"
          >
            Undo
          </button>
        )}
      </td>
    </tr>
  );
}

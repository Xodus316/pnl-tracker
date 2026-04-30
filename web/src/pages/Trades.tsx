import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Filters } from "../api/client";
import FiltersBar from "../components/FiltersBar";
import { fmtDate, fmtUsd, pnlColor } from "../lib/format";

export default function Trades() {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["trades", filters, page],
    queryFn: () => api.trades({ ...filters, page, pageSize }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-cyber-100">
          Trades
        </h1>
        {data && (
          <div className="text-sm text-cyber-400">
            {data.total.toLocaleString()} total
          </div>
        )}
      </div>

      <FiltersBar
        value={filters}
        onChange={(f) => {
          setFilters(f);
          setPage(1);
        }}
      />

      <div className="rounded-lg border border-cyber-800 bg-cyber-950/70 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cyber-900 text-cyber-400 text-xs uppercase tracking-[0.15em]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Close</th>
              <th className="text-left px-3 py-2 font-medium">Stock</th>
              <th className="text-left px-3 py-2 font-medium">Dir</th>
              <th className="text-left px-3 py-2 font-medium">Strategy</th>
              <th className="text-left px-3 py-2 font-medium">Strikes</th>
              <th className="text-right px-3 py-2 font-medium">Qty</th>
              <th className="text-right px-3 py-2 font-medium">Open</th>
              <th className="text-right px-3 py-2 font-medium">Close</th>
              <th className="text-right px-3 py-2 font-medium">Fees</th>
              <th className="text-right px-3 py-2 font-medium">P&L</th>
              <th className="text-left px-3 py-2 font-medium">W/L</th>
              <th className="text-left px-3 py-2 font-medium">Broker</th>
              <th className="text-left px-3 py-2 font-medium">Bot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyber-800">
            {isLoading && (
              <tr>
                <td
                  colSpan={13}
                  className="px-3 py-6 text-center text-cyber-500"
                >
                  Loading…
                </td>
              </tr>
            )}
            {data?.items.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={13}
                  className="px-3 py-6 text-center text-cyber-500"
                >
                  No trades match.
                </td>
              </tr>
            )}
            {data?.items.map((t) => {
              const profit = Number(t.profit);
              return (
                <tr key={t.id} className="hover:bg-neon-cyan/[0.03] transition-colors duration-200">
                  <td className="px-3 py-1.5 tabular-nums">{fmtDate(t.closeDate)}</td>
                  <td className="px-3 py-1.5 font-medium text-cyber-200">{t.stock}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className={`px-1 rounded text-[10px] font-medium ${
                        t.direction.toLowerCase() === "short"
                          ? "bg-neon-amber/15 text-neon-amber"
                          : "bg-neon-blue/15 text-neon-blue"
                      }`}
                    >
                      {t.direction}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">{t.strategy}</td>
                  <td className="px-3 py-1.5 text-cyber-400">
                    {t.strikes ?? ""}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {t.amount}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {fmtUsd(t.openingPrice)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {fmtUsd(t.closingPrice)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-cyber-400">
                    {fmtUsd(t.fees)}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right tabular-nums font-medium ${pnlColor(profit)}`}
                  >
                    {fmtUsd(profit)}
                  </td>
                  <td className="px-3 py-1.5">
                    <span
                      className={
                        t.winLoss === "W" ? "text-profit" : "text-loss"
                      }
                    >
                      {t.winLoss}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-cyber-400">
                    {t.broker ?? ""}
                  </td>
                  <td className="px-3 py-1.5 text-cyber-400">
                    {t.bot ? "✓" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-cyber-700 text-cyber-400 disabled:opacity-30 hover:border-neon-cyan/30 hover:text-neon-cyan hover:shadow-neon-cyan-sm transition-all duration-200"
          >
            ← Prev
          </button>
          <div className="text-cyber-400">
            Page {page} of {totalPages}
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-cyber-700 text-cyber-400 disabled:opacity-30 hover:border-neon-cyan/30 hover:text-neon-cyan hover:shadow-neon-cyan-sm transition-all duration-200"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

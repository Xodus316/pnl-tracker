import { useMemo, useState } from "react";
import type { StrategySummary } from "../api/client";
import { fmtPct, fmtUsd, pnlColor } from "../lib/format";

type SortKey =
  | "direction"
  | "strategy"
  | "trades"
  | "wins"
  | "losses"
  | "winRate"
  | "totalProfit";
type SortDir = "asc" | "desc";

const NUMERIC_KEYS: SortKey[] = [
  "trades",
  "wins",
  "losses",
  "winRate",
  "totalProfit",
];

const COLUMNS: {
  key: SortKey;
  label: string;
  align: "left" | "right";
}[] = [
  { key: "direction", label: "Direction", align: "left" },
  { key: "strategy", label: "Strategy", align: "left" },
  { key: "trades", label: "Trades", align: "right" },
  { key: "wins", label: "Wins", align: "right" },
  { key: "losses", label: "Losses", align: "right" },
  { key: "winRate", label: "Win rate", align: "right" },
  { key: "totalProfit", label: "Total P&L", align: "right" },
];

export default function StrategyBreakdown({
  data,
  onRowClick,
}: {
  data: StrategySummary[];
  onRowClick?: (direction: string, strategy: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("totalProfit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(NUMERIC_KEYS.includes(key) ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  if (data.length === 0) {
    return (
      <div className="text-cyber-500 text-sm py-6 text-center border border-dashed border-cyber-800 rounded-lg">
        No strategies in range.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-cyber-800 bg-cyber-950/70 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-cyber-900 text-cyber-400 text-xs uppercase tracking-[0.15em]">
          <tr>
            {COLUMNS.map((col) => {
              const active = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-2 font-medium select-none ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className={`inline-flex items-center gap-1 transition-colors duration-200 ${
                      col.align === "right" ? "flex-row-reverse" : ""
                    } ${active ? "text-neon-cyan" : "hover:text-neon-cyan"}`}
                    aria-sort={
                      active
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <span>{col.label}</span>
                    <span className="text-[10px] w-2.5 text-neon-cyan">
                      {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-cyber-800">
          {sorted.map((s) => (
            <tr
              key={`${s.direction}|${s.strategy}`}
              onClick={
                onRowClick ? () => onRowClick(s.direction, s.strategy) : undefined
              }
              className={`hover:bg-neon-cyan/[0.03] transition-colors duration-200 ${onRowClick ? "cursor-pointer" : ""}`}
            >
              <td className="px-4 py-2">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                    s.direction.toLowerCase() === "short"
                      ? "bg-neon-amber/15 text-neon-amber"
                      : "bg-neon-blue/15 text-neon-blue"
                  }`}
                >
                  {s.direction}
                </span>
              </td>
              <td className="px-4 py-2 font-medium text-cyber-200">{s.strategy}</td>
              <td className="px-4 py-2 text-right tabular-nums">{s.trades}</td>
              <td className="px-4 py-2 text-right tabular-nums text-profit">
                {s.wins}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-loss">
                {s.losses}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {fmtPct(s.winRate)}
              </td>
              <td
                className={`px-4 py-2 text-right tabular-nums font-medium ${pnlColor(s.totalProfit)}`}
              >
                {fmtUsd(s.totalProfit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { SummaryStats } from "../api/client";
import { fmtPct, fmtUsd, pnlColor } from "../lib/format";

function fmtPF(pf: number | null): string {
  if (pf == null) return "∞";
  if (!Number.isFinite(pf)) return "—";
  return pf.toFixed(2);
}

export default function KpiCards({ data }: { data: SummaryStats | undefined }) {
  const items: { label: string; value: string; className?: string }[] = [
    {
      label: "Total P&L",
      value: data ? fmtUsd(data.totalProfit) : "—",
      className: data ? pnlColor(data.totalProfit) : "",
    },
    {
      label: "Trades",
      value: data ? data.trades.toLocaleString() : "—",
    },
    {
      label: "Win rate",
      value: data ? fmtPct(data.winRate) : "—",
    },
    {
      label: "Profit factor",
      value: data ? fmtPF(data.profitFactor) : "—",
      className: data
        ? data.profitFactor == null || data.profitFactor >= 1
          ? "text-profit"
          : "text-loss"
        : "",
    },
    {
      label: "Expectancy",
      value: data ? fmtUsd(data.expectancy) : "—",
      className: data ? pnlColor(data.expectancy) : "",
    },
    {
      label: "Avg win",
      value: data ? fmtUsd(data.avgWin) : "—",
      className: "text-profit",
    },
    {
      label: "Avg loss",
      value: data ? fmtUsd(data.avgLoss) : "—",
      className: "text-loss",
    },
  ];
  return (
    <div>
      <div className="h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {items.map((it, i) => (
          <div
            key={it.label}
            className="rounded-lg border border-cyber-800 bg-cyber-950/70 px-4 py-4 transition-all duration-300 hover:border-neon-cyan/30 hover:shadow-neon-cyan-sm opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="text-xs uppercase tracking-[0.15em] text-cyber-400 font-body font-medium">
              {it.label}
            </div>
            <div
              className={`mt-1 font-display text-2xl font-bold tabular-nums ${it.className ?? ""}`}
            >
              {it.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { api, type Filters, type SummaryStats } from "../api/client";
import { fmtPct, fmtUsd, pnlColor } from "../lib/format";

function fmtPF(pf: number | null): string {
  if (pf == null) return "∞";
  if (!Number.isFinite(pf)) return "—";
  return pf.toFixed(2);
}

function Panel({
  title,
  accent,
  data,
}: {
  title: string;
  accent: string;
  data: SummaryStats | undefined;
}) {
  const rows: { label: string; value: string; cls?: string }[] = data
    ? [
        {
          label: "Total P&L",
          value: fmtUsd(data.totalProfit),
          cls: pnlColor(data.totalProfit),
        },
        {
          label: "Trades",
          value: data.trades.toLocaleString(),
        },
        {
          label: "Win rate",
          value: fmtPct(data.winRate),
        },
        {
          label: "Profit factor",
          value: fmtPF(data.profitFactor),
          cls:
            data.profitFactor == null || data.profitFactor >= 1
              ? "text-profit"
              : "text-loss",
        },
        {
          label: "Expectancy",
          value: fmtUsd(data.expectancy),
          cls: pnlColor(data.expectancy),
        },
        {
          label: "Avg win / loss",
          value: `${fmtUsd(data.avgWin)} / ${fmtUsd(data.avgLoss)}`,
        },
      ]
    : [];

  return (
    <div className="rounded-lg border border-cyber-800 bg-cyber-950/70 overflow-hidden transition-all duration-300 hover:border-cyber-700 hover:shadow-card-hover">
      <div
        className={`px-3 py-1.5 text-xs uppercase tracking-[0.15em] font-body font-medium ${accent}`}
      >
        {title}
      </div>
      {!data ? (
        <div className="p-3 text-xs text-cyber-500">Loading…</div>
      ) : data.trades === 0 ? (
        <div className="p-3 text-xs text-cyber-500">No trades.</div>
      ) : (
        <ul className="divide-y divide-cyber-800/60 text-sm">
          {rows.map((r) => (
            <li
              key={r.label}
              className="px-3 py-1.5 flex items-baseline justify-between gap-3"
            >
              <span className="text-cyber-500 text-xs uppercase tracking-[0.15em]">
                {r.label}
              </span>
              <span className={`tabular-nums font-medium ${r.cls ?? ""}`}>
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BotVsManual({ filters }: { filters: Filters }) {
  const botQ = useQuery({
    queryKey: ["summary-bot", filters],
    queryFn: () => api.summary({ ...filters, bot: true }),
  });
  const manQ = useQuery({
    queryKey: ["summary-manual", filters],
    queryFn: () => api.summary({ ...filters, bot: false }),
  });

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Panel
        title="Bot"
        accent="bg-neon-blue/15 text-neon-blue"
        data={botQ.data}
      />
      <Panel
        title="Manual"
        accent="bg-neon-amber/15 text-neon-amber"
        data={manQ.data}
      />
    </div>
  );
}

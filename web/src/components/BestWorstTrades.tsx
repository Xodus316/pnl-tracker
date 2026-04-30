import type { ExtremesResult, Trade } from "../api/client";
import { fmtDate, fmtUsd, pnlColor } from "../lib/format";

function TradeRow({ t }: { t: Trade }) {
  const profit = Number(t.profit);
  return (
    <li className="px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-neon-cyan/[0.03] transition-colors duration-200">
      <span className="text-cyber-500 tabular-nums w-[72px] shrink-0">
        {fmtDate(t.closeDate)}
      </span>
      <span
        className={`px-1 rounded text-[10px] font-medium shrink-0 ${
          t.direction.toLowerCase() === "short"
            ? "bg-neon-amber/15 text-neon-amber"
            : "bg-neon-blue/15 text-neon-blue"
        }`}
      >
        {t.direction[0]}
      </span>
      <span className="font-medium text-cyber-200 shrink-0">{t.stock}</span>
      <span className="text-cyber-400 truncate flex-1">{t.strategy}</span>
      <span className={`tabular-nums font-medium ${pnlColor(profit)}`}>
        {fmtUsd(profit)}
      </span>
    </li>
  );
}

export default function BestWorstTrades({
  data,
}: {
  data: ExtremesResult | undefined;
}) {
  if (!data) {
    return (
      <div className="h-32 grid place-items-center text-cyber-500 text-sm border border-dashed border-cyber-800 rounded-lg">
        Loading…
      </div>
    );
  }
  if (data.tradeCount === 0) {
    return (
      <div className="h-32 grid place-items-center text-cyber-500 text-sm border border-dashed border-cyber-800 rounded-lg">
        No trades in range.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-cyber-800 bg-cyber-950/70 overflow-hidden transition-all duration-300 hover:border-cyber-700 hover:shadow-card-hover">
          <div className="px-3 py-1.5 text-xs uppercase tracking-[0.15em] font-body font-medium bg-neon-green/[0.05] text-neon-green">
            Top {data.limit} winners
          </div>
          {data.winners.length === 0 ? (
            <div className="px-3 py-3 text-xs text-cyber-500">No wins.</div>
          ) : (
            <ul className="divide-y divide-cyber-800">
              {data.winners.map((t) => (
                <TradeRow key={t.id} t={t} />
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-cyber-800 bg-cyber-950/70 overflow-hidden transition-all duration-300 hover:border-cyber-700 hover:shadow-card-hover">
          <div className="px-3 py-1.5 text-xs uppercase tracking-[0.15em] font-body font-medium bg-neon-magenta/[0.05] text-neon-magenta">
            Bottom {data.limit} losers
          </div>
          {data.losers.length === 0 ? (
            <div className="px-3 py-3 text-xs text-cyber-500">No losses.</div>
          ) : (
            <ul className="divide-y divide-cyber-800">
              {data.losers.map((t) => (
                <TradeRow key={t.id} t={t} />
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg border border-cyber-800 bg-cyber-950/70 px-3 py-2">
          <div className="text-cyber-500 uppercase tracking-[0.15em]">
            Total P&L
          </div>
          <div
            className={`text-base font-display font-semibold tabular-nums ${pnlColor(data.totalProfit)}`}
          >
            {fmtUsd(data.totalProfit)}
          </div>
        </div>
        <div className="rounded-lg border border-cyber-800 bg-cyber-950/70 px-3 py-2">
          <div className="text-cyber-500 uppercase tracking-[0.15em]">
            Without worst {data.limit}
          </div>
          <div
            className={`text-base font-display font-semibold tabular-nums ${pnlColor(data.withoutWorstN)}`}
          >
            {fmtUsd(data.withoutWorstN)}
          </div>
        </div>
        <div className="rounded-lg border border-cyber-800 bg-cyber-950/70 px-3 py-2">
          <div className="text-cyber-500 uppercase tracking-[0.15em]">
            Without best {data.limit}
          </div>
          <div
            className={`text-base font-display font-semibold tabular-nums ${pnlColor(data.withoutBestN)}`}
          >
            {fmtUsd(data.withoutBestN)}
          </div>
        </div>
      </div>
    </div>
  );
}

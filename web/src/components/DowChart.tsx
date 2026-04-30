import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DowSummary } from "../api/client";
import { fmtPct, fmtUsd, pnlColor } from "../lib/format";

const DAY_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function DowTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DowSummary }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const r = payload[0].payload;
  return (
    <div className="bg-cyber-950/95 border border-neon-cyan/20 rounded-lg shadow-neon-cyan-sm text-xs px-3 py-2 min-w-[200px] backdrop-blur-sm">
      <div className="text-cyber-400 font-medium mb-1">{DAY_LABELS[r.dow]}</div>
      <div className="flex justify-between gap-3">
        <span className="text-cyber-500">Total P&L</span>
        <span className={`tabular-nums ${pnlColor(r.profit)}`}>
          {fmtUsd(r.profit)}
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-cyber-500">Trades</span>
        <span className="tabular-nums text-cyber-200">{r.trades}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-cyber-500">Wins / Losses</span>
        <span className="tabular-nums text-cyber-200">
          <span className="text-profit">{r.wins}</span> /{" "}
          <span className="text-loss">{r.losses}</span>
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-cyber-500">Win rate</span>
        <span className="tabular-nums text-cyber-200">
          {fmtPct(r.winRate)}
        </span>
      </div>
    </div>
  );
}

export default function DowChart({ data }: { data: DowSummary[] }) {
  const totalTrades = data.reduce((acc, d) => acc + d.trades, 0);
  if (totalTrades === 0) {
    return (
      <div className="h-40 grid place-items-center text-cyber-500 text-sm border border-dashed border-cyber-800 rounded-lg">
        No trades.
      </div>
    );
  }
  const labeled = data.map((d) => ({ ...d, day: DAY_LABELS[d.dow] }));
  return (
    <div className="cyber-card p-4">
      <div className="section-heading mb-2">P&L by day of week</div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={labeled}
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#1e1e2e" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "#7a7a99", fontSize: 12 }}
              stroke="#2a2a3d"
            />
            <YAxis
              tick={{ fill: "#7a7a99", fontSize: 11 }}
              stroke="#2a2a3d"
              tickFormatter={(v) => fmtUsd(v).replace(".00", "")}
              width={80}
            />
            <Tooltip
              cursor={{ fill: "rgba(0, 240, 255, 0.04)" }}
              content={<DowTooltip />}
              wrapperStyle={{ outline: "none" }}
            />
            <Bar dataKey="profit">
              {labeled.map((d, i) => (
                <Cell key={i} fill={d.profit >= 0 ? "#39ff14" : "#ff2d78"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

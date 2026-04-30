import { useMemo } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceLine,
} from "recharts";
import type { HoldingPeriodPoint } from "../api/client";
import { fmtUsd, pnlColor } from "../lib/format";

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: HoldingPeriodPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const r = payload[0].payload;
  return (
    <div className="bg-cyber-950/95 border border-neon-cyan/20 rounded-lg shadow-neon-cyan-sm text-xs px-3 py-2 min-w-[220px] backdrop-blur-sm">
      <div className="flex justify-between gap-3 text-cyber-400 mb-1">
        <span>{r.closeDate}</span>
        <span className={`tabular-nums font-medium ${pnlColor(r.profit)}`}>
          {fmtUsd(r.profit)}
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-cyber-500">Held</span>
        <span className="tabular-nums text-cyber-200">
          {r.days} day{r.days === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-cyber-500">Trade</span>
        <span className="text-cyber-200">
          {r.direction} {r.stock}{" "}
          <span className="text-cyber-400">{r.strategy}</span>
        </span>
      </div>
    </div>
  );
}

export default function HoldingPeriodScatter({
  data,
}: {
  data: HoldingPeriodPoint[];
}) {
  const { wins, losses, avgWinDays, avgLossDays } = useMemo(() => {
    const wins: HoldingPeriodPoint[] = [];
    const losses: HoldingPeriodPoint[] = [];
    let wd = 0;
    let ld = 0;
    for (const p of data) {
      if (p.profit > 0) {
        wins.push(p);
        wd += p.days;
      } else if (p.profit < 0) {
        losses.push(p);
        ld += p.days;
      }
    }
    return {
      wins,
      losses,
      avgWinDays: wins.length > 0 ? wd / wins.length : 0,
      avgLossDays: losses.length > 0 ? ld / losses.length : 0,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-56 grid place-items-center text-cyber-500 text-sm border border-dashed border-cyber-800 rounded-lg">
        No data.
      </div>
    );
  }
  return (
    <div className="cyber-card p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="section-heading">Holding period vs P&L</span>
        <span className="text-[11px] text-cyber-500">
          avg held: <span className="text-profit">{avgWinDays.toFixed(1)}d</span>{" "}
          win,{" "}
          <span className="text-loss">{avgLossDays.toFixed(1)}d</span> loss
        </span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1e1e2e" />
            <XAxis
              type="number"
              dataKey="days"
              name="Days held"
              tick={{ fill: "#7a7a99", fontSize: 11 }}
              stroke="#2a2a3d"
              label={{
                value: "days held",
                position: "insideBottom",
                offset: -2,
                fill: "#525270",
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="profit"
              name="P&L"
              tick={{ fill: "#7a7a99", fontSize: 11 }}
              stroke="#2a2a3d"
              tickFormatter={(v) => fmtUsd(v).replace(".00", "")}
              width={80}
            />
            <ZAxis range={[40, 40]} />
            <ReferenceLine y={0} stroke="#3a3a52" strokeDasharray="4 4" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#3a3a52" }}
              content={<ScatterTooltip />}
              wrapperStyle={{ outline: "none" }}
            />
            <Scatter
              name="Wins"
              data={wins}
              fill="#39ff14"
              fillOpacity={0.8}
            />
            <Scatter
              name="Losses"
              data={losses}
              fill="#ff2d78"
              fillOpacity={0.8}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

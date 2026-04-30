import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PnlBucket } from "../api/client";
import { fmtUsd } from "../lib/format";

interface DDRow {
  bucket: string;
  cumulative: number;
  peak: number;
  drawdown: number;
}

function DDTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DDRow }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const r = payload[0].payload;
  return (
    <div className="bg-cyber-950/95 border border-neon-cyan/20 rounded-lg shadow-neon-cyan-sm text-xs px-3 py-2 min-w-[200px] backdrop-blur-sm">
      <div className="text-cyber-400 font-medium mb-1">{r.bucket}</div>
      <div className="flex justify-between gap-3">
        <span className="text-cyber-500">Equity</span>
        <span className="tabular-nums text-cyber-200">
          {fmtUsd(r.cumulative)}
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-cyber-500">Peak</span>
        <span className="tabular-nums text-cyber-200">{fmtUsd(r.peak)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-cyber-500">Drawdown</span>
        <span className="tabular-nums text-loss">{fmtUsd(r.drawdown)}</span>
      </div>
    </div>
  );
}

export default function DrawdownChart({ data }: { data: PnlBucket[] }) {
  const rows = useMemo<DDRow[]>(() => {
    let running = 0;
    let peak = 0;
    return data.map((d) => {
      running += d.profit;
      peak = Math.max(peak, running);
      return {
        bucket: d.bucket,
        cumulative: running,
        peak,
        drawdown: running - peak,
      };
    });
  }, [data]);

  const maxDD = useMemo(() => {
    return rows.reduce((min, r) => Math.min(min, r.drawdown), 0);
  }, [rows]);

  if (data.length === 0) {
    return (
      <div className="h-48 grid place-items-center text-cyber-500 text-sm border border-dashed border-cyber-800 rounded-lg">
        No data.
      </div>
    );
  }
  return (
    <div className="cyber-card p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="section-heading">Drawdown</span>
        <span className="text-xs">
          <span className="text-cyber-500">max DD: </span>
          <span className="text-loss font-medium tabular-nums">
            {fmtUsd(maxDD)}
          </span>
        </span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={rows}
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff2d78" stopOpacity={0} />
                <stop offset="100%" stopColor="#ff2d78" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e1e2e" vertical={false} />
            <XAxis
              dataKey="bucket"
              tick={{ fill: "#7a7a99", fontSize: 11 }}
              stroke="#2a2a3d"
            />
            <YAxis
              tick={{ fill: "#7a7a99", fontSize: 11 }}
              stroke="#2a2a3d"
              tickFormatter={(v) => fmtUsd(v).replace(".00", "")}
              width={80}
            />
            <Tooltip
              cursor={{ stroke: "#3a3a52", strokeDasharray: "3 3" }}
              content={<DDTooltip />}
              wrapperStyle={{ outline: "none" }}
            />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke="#ff2d78"
              strokeWidth={1.5}
              fill="url(#ddFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

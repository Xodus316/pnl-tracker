import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PnlBucket } from "../api/client";
import { fmtUsd, pnlColor } from "../lib/format";

const MAX_TRADES_IN_TOOLTIP = 25;

interface ChartRow extends PnlBucket {
  cumulative: number;
}

function BucketTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const bucket = payload[0].payload;
  const trades = bucket.trades ?? [];
  const visible = trades.slice(0, MAX_TRADES_IN_TOOLTIP);
  const hidden = trades.length - visible.length;

  return (
    <div className="bg-cyber-950/95 border border-neon-cyan/20 rounded-lg shadow-neon-cyan-sm text-xs min-w-[300px] max-w-[380px] backdrop-blur-sm">
      <div className="px-3 py-2 border-b border-cyber-800">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-cyber-400 font-medium">{bucket.bucket}</span>
          <span
            className={`font-semibold tabular-nums ${pnlColor(bucket.profit)}`}
          >
            {fmtUsd(bucket.profit)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 mt-0.5 text-[11px]">
          <span className="text-cyber-500">cumulative</span>
          <span
            className={`tabular-nums ${pnlColor(bucket.cumulative)}`}
          >
            {fmtUsd(bucket.cumulative)}
          </span>
        </div>
      </div>
      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-cyber-500 flex justify-between">
        <span>
          {bucket.tradeCount} trade{bucket.tradeCount === 1 ? "" : "s"}
        </span>
        <span>P&L</span>
      </div>
      {trades.length === 0 ? (
        <div className="px-3 pb-2 text-cyber-500">No trades.</div>
      ) : (
        <ul className="divide-y divide-cyber-800/60">
          {visible.map((t, i) => (
            <li
              key={i}
              className="px-3 py-1 flex items-center gap-2 justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`shrink-0 px-1 rounded text-[10px] font-medium ${
                    t.direction.toLowerCase() === "short"
                      ? "bg-neon-amber/15 text-neon-amber"
                      : "bg-neon-blue/15 text-neon-blue"
                  }`}
                >
                  {t.direction[0]?.toUpperCase()}
                </span>
                <span className="font-medium text-cyber-200 shrink-0">
                  {t.stock}
                </span>
                <span className="text-cyber-400 truncate">{t.strategy}</span>
              </div>
              <span
                className={`tabular-nums font-medium shrink-0 ${pnlColor(t.profit)}`}
              >
                {fmtUsd(t.profit)}
              </span>
            </li>
          ))}
          {hidden > 0 && (
            <li className="px-3 py-1 text-cyber-500 text-center">
              + {hidden} more
            </li>
          )}
        </ul>
      )}
      <div className="px-3 py-1.5 text-[10px] text-cyber-500 border-t border-cyber-800/60 text-center">
        click to filter to this period
      </div>
    </div>
  );
}

export default function PnLChart({
  data,
  onBucketClick,
}: {
  data: PnlBucket[];
  onBucketClick?: (bucket: string) => void;
}) {
  const rows = useMemo<ChartRow[]>(() => {
    let running = 0;
    return data.map((d) => {
      running += d.profit;
      return { ...d, cumulative: running };
    });
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-80 grid place-items-center text-cyber-500 text-sm border border-dashed border-cyber-800 rounded-lg">
        No trades match the current filters.
      </div>
    );
  }
  return (
    <div className="h-80 cyber-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <defs>
            <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid stroke="#1e1e2e" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fill: "#7a7a99", fontSize: 12 }}
            stroke="#2a2a3d"
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "#7a7a99", fontSize: 12 }}
            stroke="#2a2a3d"
            tickFormatter={(v) => fmtUsd(v).replace(".00", "")}
            width={80}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#a0a0bd", fontSize: 12 }}
            stroke="#2a2a3d"
            tickFormatter={(v) => fmtUsd(v).replace(".00", "")}
            width={80}
          />
          <Tooltip
            cursor={{ fill: "rgba(0, 240, 255, 0.04)" }}
            content={<BucketTooltip />}
            wrapperStyle={{ outline: "none", zIndex: 50 }}
          />
          <Bar
            yAxisId="left"
            dataKey="profit"
            onClick={(d: ChartRow) => onBucketClick?.(d.bucket)}
            cursor={onBucketClick ? "pointer" : undefined}
          >
            {rows.map((d, i) => (
              <Cell key={i} fill={d.profit >= 0 ? "#39ff14" : "#ff2d78"} />
            ))}
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            stroke="#00f0ff"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: "#00f0ff", stroke: "#0a0a0f", strokeWidth: 2 }}
            isAnimationActive={false}
            filter="url(#glowCyan)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

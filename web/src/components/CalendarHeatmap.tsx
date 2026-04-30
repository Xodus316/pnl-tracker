import { useMemo, useState } from "react";
import {
  addWeeks,
  eachDayOfInterval,
  format,
  getDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import type { PnlBucket } from "../api/client";
import { fmtUsd } from "../lib/format";

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];
const CELL = 12;
const GAP = 3;

export default function CalendarHeatmap({
  data,
  onDayClick,
}: {
  data: PnlBucket[];
  onDayClick?: (date: string) => void;
}) {
  const [hover, setHover] = useState<{
    date: string;
    profit: number;
    tradeCount: number;
    x: number;
    y: number;
  } | null>(null);

  const { columns, maxAbs, totalDays } = useMemo(() => {
    if (data.length === 0) {
      return {
        columns: [] as { weekStart: Date; days: (PnlBucket | null)[] }[],
        maxAbs: 0,
        totalDays: 0,
      };
    }
    const map = new Map<string, PnlBucket>();
    for (const b of data) map.set(b.bucket, b);
    const sortedKeys = [...map.keys()].sort();
    const start = parseISO(sortedKeys[0]);
    const end = parseISO(sortedKeys[sortedKeys.length - 1]);
    const days = eachDayOfInterval({ start, end });

    const firstWeek = startOfWeek(start, { weekStartsOn: 1 });
    const cols: { weekStart: Date; days: (PnlBucket | null)[] }[] = [];
    let cursor = firstWeek;
    let dayIdx = 0;
    while (dayIdx < days.length) {
      const week: (PnlBucket | null)[] = Array(7).fill(null);
      for (let dow = 0; dow < 7 && dayIdx < days.length; dow++) {
        const d = days[dayIdx];
        const weekDayIdx = (getDay(d) + 6) % 7;
        if (
          d >= cursor &&
          d < addWeeks(cursor, 1) &&
          weekDayIdx === dow &&
          format(d, "yyyy-MM-dd") === format(d, "yyyy-MM-dd")
        ) {
          week[dow] = map.get(format(d, "yyyy-MM-dd")) ?? {
            bucket: format(d, "yyyy-MM-dd"),
            profit: 0,
            tradeCount: 0,
            trades: [],
          };
          dayIdx++;
        }
      }
      cols.push({ weekStart: cursor, days: week });
      cursor = addWeeks(cursor, 1);
    }
    let max = 0;
    for (const b of data) max = Math.max(max, Math.abs(b.profit));
    return { columns: cols, maxAbs: max, totalDays: days.length };
  }, [data]);

  if (totalDays === 0) {
    return (
      <div className="h-32 grid place-items-center text-cyber-500 text-sm border border-dashed border-cyber-800 rounded-lg">
        No data.
      </div>
    );
  }

  function colorFor(profit: number, tradeCount: number): string {
    if (tradeCount === 0) return "#1e1e2e";
    if (maxAbs === 0) return "#2a2a3d";
    const intensity = Math.min(1, Math.abs(profit) / maxAbs);
    const alpha = 0.25 + intensity * 0.75;
    if (profit > 0) return `rgba(57, 255, 20, ${alpha})`;
    if (profit < 0) return `rgba(255, 45, 120, ${alpha})`;
    return "#2a2a3d";
  }

  const width = columns.length * (CELL + GAP) + 24;
  const height = 7 * (CELL + GAP) + 16;

  return (
    <div className="cyber-card p-4 relative">
      <div className="section-heading mb-2">Daily heatmap</div>
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block">
          {DAY_LABELS.map((lbl, i) => (
            <text
              key={i}
              x={0}
              y={i * (CELL + GAP) + CELL - 2 + 16}
              fontSize="9"
              fill="#525270"
            >
              {lbl}
            </text>
          ))}
          {columns.map((col, x) => {
            const monthLabel =
              x === 0 || col.weekStart.getDate() <= 7
                ? format(col.weekStart, "MMM")
                : "";
            return (
              <g key={x}>
                {monthLabel && (
                  <text
                    x={20 + x * (CELL + GAP)}
                    y={10}
                    fontSize="9"
                    fill="#525270"
                  >
                    {monthLabel}
                  </text>
                )}
                {col.days.map((day, y) => {
                  if (!day) return null;
                  const cx = 20 + x * (CELL + GAP);
                  const cy = 16 + y * (CELL + GAP);
                  return (
                    <rect
                      key={y}
                      x={cx}
                      y={cy}
                      width={CELL}
                      height={CELL}
                      rx={2}
                      fill={colorFor(day.profit, day.tradeCount)}
                      stroke="#0a0a0f"
                      strokeWidth={0.5}
                      style={{
                        cursor:
                          onDayClick && day.tradeCount > 0
                            ? "pointer"
                            : "default",
                      }}
                      onMouseEnter={(e) => {
                        const r = (
                          e.target as SVGRectElement
                        ).getBoundingClientRect();
                        setHover({
                          date: day.bucket,
                          profit: day.profit,
                          tradeCount: day.tradeCount,
                          x: r.left + r.width / 2,
                          y: r.top,
                        });
                      }}
                      onMouseLeave={() => setHover(null)}
                      onClick={() =>
                        day.tradeCount > 0 && onDayClick?.(day.bucket)
                      }
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-cyber-500">
        <span>less</span>
        <span
          className="inline-block rounded-sm"
          style={{
            width: 10,
            height: 10,
            background: "rgba(255, 45, 120, 0.85)",
          }}
        />
        <span
          className="inline-block rounded-sm"
          style={{
            width: 10,
            height: 10,
            background: "rgba(255, 45, 120, 0.4)",
          }}
        />
        <span
          className="inline-block rounded-sm"
          style={{ width: 10, height: 10, background: "#1e1e2e" }}
        />
        <span
          className="inline-block rounded-sm"
          style={{
            width: 10,
            height: 10,
            background: "rgba(57, 255, 20, 0.4)",
          }}
        />
        <span
          className="inline-block rounded-sm"
          style={{
            width: 10,
            height: 10,
            background: "rgba(57, 255, 20, 0.85)",
          }}
        />
        <span>more</span>
      </div>
      {hover && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full pointer-events-none bg-cyber-950/95 border border-neon-cyan/20 rounded-lg px-2.5 py-1.5 text-xs shadow-neon-cyan-sm backdrop-blur-sm"
          style={{ left: hover.x, top: hover.y - 6 }}
        >
          <div className="text-cyber-400">{hover.date}</div>
          <div className="flex justify-between gap-3">
            <span
              className={
                hover.profit > 0
                  ? "text-profit"
                  : hover.profit < 0
                    ? "text-loss"
                    : "text-cyber-300"
              }
            >
              {fmtUsd(hover.profit)}
            </span>
            <span className="text-cyber-500">
              {hover.tradeCount} trade{hover.tradeCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

import type { StreakStats } from "../api/client";

export default function StreaksPanel({
  data,
}: {
  data: StreakStats | undefined;
}) {
  if (!data) {
    return (
      <div className="h-24 grid place-items-center text-cyber-500 text-sm border border-dashed border-cyber-800 rounded-lg">
        Loading…
      </div>
    );
  }
  const cur = data.currentStreak;
  const curColor =
    cur.type === "W"
      ? "text-profit"
      : cur.type === "L"
        ? "text-loss"
        : "text-cyber-400";
  const items: { label: string; value: string; cls?: string }[] = [
    {
      label: "Current streak",
      value:
        cur.type === "none"
          ? "—"
          : `${cur.length} ${cur.type === "W" ? "win" : "loss"}${cur.length === 1 ? "" : "es"}`,
      cls: curColor,
    },
    {
      label: "Longest win streak",
      value: data.longestWin.toString(),
      cls: "text-profit",
    },
    {
      label: "Longest loss streak",
      value: data.longestLoss.toString(),
      cls: "text-loss",
    },
    {
      label: "Avg win streak",
      value: data.avgWinStreak.toFixed(1),
    },
    {
      label: "Avg loss streak",
      value: data.avgLossStreak.toFixed(1),
    },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((it, i) => (
        <div
          key={it.label}
          className="rounded-lg border border-cyber-800 bg-cyber-950/70 px-3 py-2 transition-all duration-300 hover:border-neon-cyan/30 hover:shadow-neon-cyan-sm opacity-0 animate-fade-in-up"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="text-[11px] uppercase tracking-[0.15em] text-cyber-400 font-body font-medium">
            {it.label}
          </div>
          <div
            className={`mt-1 font-display text-xl font-semibold tabular-nums ${it.cls ?? ""}`}
          >
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

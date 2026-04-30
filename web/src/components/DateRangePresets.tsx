import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from "date-fns";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

interface Preset {
  label: string;
  range: () => { from?: string; to?: string };
}

function presets(now: Date): Preset[] {
  return [
    { label: "All", range: () => ({}) },
    {
      label: "Today",
      range: () => ({ from: fmt(now), to: fmt(now) }),
    },
    {
      label: "This week",
      range: () => ({
        from: fmt(startOfWeek(now, { weekStartsOn: 1 })),
        to: fmt(endOfWeek(now, { weekStartsOn: 1 })),
      }),
    },
    {
      label: "MTD",
      range: () => ({ from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) }),
    },
    {
      label: "Last 30d",
      range: () => ({ from: fmt(subDays(now, 29)), to: fmt(now) }),
    },
    {
      label: "Last 90d",
      range: () => ({ from: fmt(subDays(now, 89)), to: fmt(now) }),
    },
    {
      label: "YTD",
      range: () => ({ from: fmt(startOfYear(now)), to: fmt(endOfYear(now)) }),
    },
  ];
}

export default function DateRangePresets({
  from,
  to,
  onChange,
}: {
  from?: string;
  to?: string;
  onChange: (range: { from?: string; to?: string }) => void;
}) {
  const items = presets(new Date());
  const activeLabel = items.find((p) => {
    const r = p.range();
    return (r.from ?? undefined) === from && (r.to ?? undefined) === to;
  })?.label;

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((p) => {
        const active = p.label === activeLabel;
        return (
          <button
            key={p.label}
            onClick={() => onChange(p.range())}
            className={`px-2.5 py-1 rounded-lg text-xs font-body font-medium border transition-all duration-200 ${
              active
                ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan shadow-neon-cyan-sm"
                : "border-cyber-700 text-cyber-400 hover:text-neon-cyan hover:border-neon-cyan/30"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

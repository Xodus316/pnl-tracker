import type { Period } from "../api/client";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export default function PeriodToggle({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-cyber-700 overflow-hidden">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 text-sm font-body font-medium transition-all duration-200 ${
            value === p.value
              ? "bg-neon-cyan/15 text-neon-cyan"
              : "bg-cyber-950 text-cyber-400 hover:text-neon-cyan"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

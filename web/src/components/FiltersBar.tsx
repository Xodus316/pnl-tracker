import { useQuery } from "@tanstack/react-query";
import { api, type Filters } from "../api/client";

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}

const inputClass =
  "bg-cyber-850 border border-cyber-700 rounded-lg px-3 py-1.5 text-sm text-cyber-100 font-body " +
  "focus:outline-none focus:border-neon-cyan/50 focus:shadow-neon-cyan-sm " +
  "transition-all duration-200";

export default function FiltersBar({ value, onChange }: Props) {
  const { data: facets } = useQuery({
    queryKey: ["facets"],
    queryFn: api.facets,
  });

  function set<K extends keyof Filters>(k: K, v: Filters[K]) {
    onChange({ ...value, [k]: v === "" || v === undefined ? undefined : v });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="From">
        <input
          type="date"
          className={inputClass}
          value={value.from ?? ""}
          onChange={(e) => set("from", e.target.value || undefined)}
        />
      </Field>
      <Field label="To">
        <input
          type="date"
          className={inputClass}
          value={value.to ?? ""}
          onChange={(e) => set("to", e.target.value || undefined)}
        />
      </Field>
      <Field label="Stock">
        <select
          className={inputClass}
          value={value.stock ?? ""}
          onChange={(e) => set("stock", e.target.value || undefined)}
        >
          <option value="">All</option>
          {facets?.stocks.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Strategy">
        <select
          className={inputClass}
          value={value.strategy ?? ""}
          onChange={(e) => set("strategy", e.target.value || undefined)}
        >
          <option value="">All</option>
          {facets?.strategies.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Direction">
        <select
          className={inputClass}
          value={value.direction ?? ""}
          onChange={(e) => set("direction", e.target.value || undefined)}
        >
          <option value="">All</option>
          {facets?.directions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Broker">
        <select
          className={inputClass}
          value={value.broker ?? ""}
          onChange={(e) => set("broker", e.target.value || undefined)}
        >
          <option value="">All</option>
          {facets?.brokers.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Bot">
        <select
          className={inputClass}
          value={value.bot === undefined ? "" : value.bot ? "true" : "false"}
          onChange={(e) =>
            set(
              "bot",
              e.target.value === ""
                ? undefined
                : e.target.value === "true",
            )
          }
        >
          <option value="">All</option>
          <option value="true">Bot</option>
          <option value="false">Manual</option>
        </select>
      </Field>
      {Object.values(value).some((v) => v !== undefined && v !== "") && (
        <button
          onClick={() => onChange({})}
          className="ml-auto text-xs text-neon-cyan hover:text-neon-cyan/80 underline-offset-2 hover:underline transition-colors duration-200"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-[0.15em] text-cyber-400 font-body font-medium">
        {label}
      </span>
      {children}
    </label>
  );
}

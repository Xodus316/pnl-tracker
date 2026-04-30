import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Filters, type Period } from "../api/client";
import { bucketRange } from "../lib/buckets";
import PeriodToggle from "../components/PeriodToggle";
import FiltersBar from "../components/FiltersBar";
import DateRangePresets from "../components/DateRangePresets";
import KpiCards from "../components/KpiCards";
import PnLChart from "../components/PnLChart";
import DrawdownChart from "../components/DrawdownChart";
import CalendarHeatmap from "../components/CalendarHeatmap";
import StrategyBreakdown from "../components/StrategyBreakdown";
import BestWorstTrades from "../components/BestWorstTrades";
import BotVsManual from "../components/BotVsManual";
import DowChart from "../components/DowChart";
import HoldingPeriodScatter from "../components/HoldingPeriodScatter";
import StreaksPanel from "../components/StreaksPanel";

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("month");
  const [filters, setFilters] = useState<Filters>({});

  const summaryQ = useQuery({
    queryKey: ["summary", filters],
    queryFn: () => api.summary(filters),
  });

  const seriesQ = useQuery({
    queryKey: ["series", period, filters],
    queryFn: () => api.series(period, filters),
  });

  const dailyQ = useQuery({
    queryKey: ["series-daily", filters],
    queryFn: () => api.series("day", filters),
  });

  const stratsQ = useQuery({
    queryKey: ["strategies", filters],
    queryFn: () => api.strategies(filters),
  });

  const extremesQ = useQuery({
    queryKey: ["extremes", filters],
    queryFn: () => api.extremes({ ...filters, limit: 10 }),
  });

  const dowQ = useQuery({
    queryKey: ["dow", filters],
    queryFn: () => api.dow(filters),
  });

  const holdingQ = useQuery({
    queryKey: ["holding-period", filters],
    queryFn: () => api.holdingPeriod(filters),
  });

  const streaksQ = useQuery({
    queryKey: ["streaks", filters],
    queryFn: () => api.streaks(filters),
  });

  function handleBucketClick(bucket: string) {
    const { from, to } = bucketRange(bucket, period);
    setFilters((f) => ({ ...f, from, to }));
  }

  function handleStrategyClick(direction: string, strategy: string) {
    setFilters((f) => ({ ...f, direction, strategy }));
  }

  function handleDayClick(date: string) {
    setFilters((f) => ({ ...f, from: date, to: date }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-cyber-100">
          Dashboard
        </h1>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      <DateRangePresets
        from={filters.from}
        to={filters.to}
        onChange={(r) => setFilters((f) => ({ ...f, ...r }))}
      />
      <FiltersBar value={filters} onChange={setFilters} />

      <KpiCards data={summaryQ.data} />

      <section className="space-y-2">
        <h2 className="section-heading">
          P&L by {period} <span className="text-cyber-600">/</span>{" "}
          <span className="text-cyber-500 normal-case tracking-normal font-body text-xs">
            click a bar to filter
          </span>
        </h2>
        <PnLChart
          data={seriesQ.data ?? []}
          onBucketClick={handleBucketClick}
        />
      </section>

      <section className="space-y-2">
        <DrawdownChart data={seriesQ.data ?? []} />
      </section>

      <section className="space-y-2">
        <CalendarHeatmap
          data={dailyQ.data ?? []}
          onDayClick={handleDayClick}
        />
      </section>

      <section className="space-y-2">
        <h2 className="section-heading">Streaks</h2>
        <StreaksPanel data={streaksQ.data} />
      </section>

      <section className="space-y-2">
        <h2 className="section-heading">Bot vs manual</h2>
        <BotVsManual filters={filters} />
      </section>

      <section className="space-y-2">
        <DowChart data={dowQ.data ?? []} />
      </section>

      <section className="space-y-2">
        <HoldingPeriodScatter data={holdingQ.data ?? []} />
      </section>

      <section className="space-y-2">
        <h2 className="section-heading">
          Best &amp; worst trades
        </h2>
        <BestWorstTrades data={extremesQ.data} />
      </section>

      <section className="space-y-2">
        <h2 className="section-heading">
          Strategy breakdown <span className="text-cyber-600">/</span>{" "}
          <span className="text-cyber-500 normal-case tracking-normal font-body text-xs">
            click a row to filter
          </span>
        </h2>
        <StrategyBreakdown
          data={stratsQ.data ?? []}
          onRowClick={handleStrategyClick}
        />
      </section>
    </div>
  );
}

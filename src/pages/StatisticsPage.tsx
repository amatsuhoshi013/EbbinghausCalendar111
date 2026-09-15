import { useState } from "react";
import { CategoryStats } from "../components/statistics/CategoryStats";
import { OverdueList } from "../components/statistics/OverdueList";
import { ReviewStats } from "../components/statistics/ReviewStats";
import { StatsOverview } from "../components/statistics/StatsOverview";
import { TrendChart } from "../components/statistics/TrendChart";
import { useAppStore } from "../stores/appStore";
import type { RangeKey } from "../services/statistics";

export function StatisticsPage() {
  const events = useAppStore((s) => s.events);
  const [range, setRange] = useState<RangeKey>("all");

  return (
    <div className="statistics-page">
      <section className="card stats-card">
        <div className="stats-card-head">
          <h2>统计总览</h2>
          <div className="segment" role="radiogroup" aria-label="统计范围">
            {(
              [
                ["today", "今天"],
                ["week", "本周"],
                ["month", "本月"],
                ["year", "今年"],
                ["all", "全部"],
              ] as [RangeKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                role="radio"
                aria-checked={range === key}
                className={`segment-option${range === key ? " active" : ""}`}
                onClick={() => setRange(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <StatsOverview events={events} range={range} />
      </section>

      <div className="stats-grid">
        <section className="card">
          <div className="stats-card-head">
            <h2>逾期事项</h2>
          </div>
          <OverdueList events={events} />
        </section>

        <section className="card">
          <div className="stats-card-head">
            <h2>分类统计</h2>
          </div>
          <CategoryStats range={range} />
        </section>

        <section className="card">
          <div className="stats-card-head">
            <h2>艾宾浩斯复习</h2>
          </div>
          <ReviewStats />
        </section>

        <section className="card">
          <div className="stats-card-head">
            <h2>完成趋势</h2>
          </div>
          <TrendChart events={events} />
        </section>
      </div>
    </div>
  );
}

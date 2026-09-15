import type { Event } from "../../types/event";
import { getOverallStats, type RangeKey } from "../../services/statistics";

const METRICS: Array<{
  key: "total" | "completed" | "uncompleted" | "completionRate";
  label: string;
  suffix: string;
  className: string;
}> = [
  { key: "total", label: "总事项", suffix: "", className: "metric-total" },
  { key: "completed", label: "已完成", suffix: "", className: "metric-done" },
  { key: "uncompleted", label: "未完成", suffix: "", className: "metric-todo" },
  { key: "completionRate", label: "完成率", suffix: "%", className: "metric-rate" },
];

export function StatsOverview({ events, range }: { events: Event[]; range: RangeKey }) {
  const stats = getOverallStats(events, range);
  return (
    <div className="metric-cards">
      {METRICS.map(({ key, label, suffix, className }) => (
        <div key={key} className={`metric ${className}`}>
          <div className="metric-value">
            {stats[key]}
            {suffix}
          </div>
          <div className="metric-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

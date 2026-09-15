import { useState } from "react";
import type { Event } from "../../types/event";
import { getDailyTrend } from "../../services/statistics";

const RANGE_OPTIONS = [7, 30, 90];

export function TrendChart({ events }: { events: Event[] }) {
  const [days, setDays] = useState(7);
  const points = getDailyTrend(events, days);
  const maxDue = Math.max(...points.map((p) => p.due), 1);
  const step = days <= 7 ? 1 : days <= 30 ? 5 : 15;
  const showLabel = (index: number) => index === 0 || index === points.length - 1 || index % step === 0;

  return (
    <div className="trend-chart">
      <div className="segment" role="radiogroup" aria-label="趋势范围">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option}
            role="radio"
            aria-checked={days === option}
            className={`segment-option${days === option ? " active" : ""}`}
            onClick={() => setDays(option)}
          >
            近 {option} 天
          </button>
        ))}
      </div>
      <div className="trend-legend">
        <span><i className="legend-dot done" />已完成</span>
        <span><i className="legend-dot overdue" />逾期</span>
        <span><i className="legend-dot created" />新增</span>
      </div>
      <div className="trend-bars">
        {points.map((point, index) => (
          <div key={point.date} className="trend-col" title={`${point.date}：到期 ${point.due}，完成 ${point.completed}，逾期 ${point.overdue}，新增 ${point.created}${point.rate === null ? "" : `，完成率 ${point.rate}%`}`}>
            <div className="trend-stack">
              {point.completed > 0 && (
                <span
                  className="trend-bar done"
                  style={{ height: `${(point.completed / maxDue) * 100}%` }}
                />
              )}
              {point.overdue > 0 && (
                <span
                  className="trend-bar overdue"
                  style={{ height: `${(point.overdue / maxDue) * 100}%` }}
                />
              )}
              {point.created > 0 && (
                <span
                  className="trend-bar created"
                  style={{ height: `${Math.min((point.created / maxDue) * 100, 100)}%` }}
                />
              )}
            </div>
            {showLabel(index) && <span className="trend-label">{point.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

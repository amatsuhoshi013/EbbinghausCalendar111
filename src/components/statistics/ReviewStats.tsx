import { useAppStore } from "../../stores/appStore";
import { getReviewStats } from "../../services/statistics";

export function ReviewStats() {
  const events = useAppStore((s) => s.events);
  const reviewPlans = useAppStore((s) => s.reviewPlans);
  const stats = getReviewStats(events, reviewPlans);

  if (!stats.eventCount) {
    return <div className="empty-hint">还没有艾宾浩斯计划</div>;
  }

  return (
    <div className="review-stats">
      <div className="review-summary">
        <span>计划 <strong>{stats.planCount}</strong></span>
        <span>复习事项 <strong>{stats.eventCount}</strong></span>
        <span>已完成 <strong>{stats.completed}</strong></span>
        <span>完成率 <strong>{stats.completionRate}%</strong></span>
      </div>
      <div className="review-bars">
        {stats.byIndex.map((item) => (
          <div key={item.index} className="review-bar-row">
            <span className="review-bar-label">{item.label}</span>
            <span className="review-bar-track">
              <span
                className={`review-bar-fill${item.rate === 100 ? " full" : ""}`}
                style={{ width: `${item.rate}%` }}
              />
            </span>
            <span className="review-bar-nums">
              {item.completed}/{item.total} · {item.rate}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

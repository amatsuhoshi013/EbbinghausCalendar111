import { useAppStore } from "../../stores/appStore";
import { getCategoryStats, type RangeKey } from "../../services/statistics";

export function CategoryStats({ range }: { range: RangeKey }) {
  const events = useAppStore((s) => s.events);
  const categories = useAppStore((s) => s.categories);
  const rows = getCategoryStats(events, categories, range);

  if (!rows.length) {
    return <div className="empty-hint">暂无分类数据</div>;
  }
  const maxTotal = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="category-stats">
      {rows.map((row) => (
        <div key={row.name} className="category-row">
          <span className="category-name">
            <i className="category-dot" style={{ background: row.color }} />
            {row.name}
          </span>
          <span className="category-bar-wrap">
            <span className="category-bar" style={{ width: `${(row.total / maxTotal) * 100}%`, background: row.color }} />
          </span>
          <span className="category-nums">
            {row.completed}/{row.total} · {row.completionRate}%
          </span>
        </div>
      ))}
    </div>
  );
}

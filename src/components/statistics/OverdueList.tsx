import { CalendarDays } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import type { Event } from "../../types/event";
import { formatDate } from "../../utils/date";
import { getOverdueEvents } from "../../services/statistics";

export function OverdueList({ events }: { events: Event[] }) {
  const selectDate = useAppStore((s) => s.selectDate);
  const setPage = useAppStore((s) => s.setPage);
  const overdue = getOverdueEvents(events);

  if (!overdue.length) {
    return <div className="empty-hint">没有逾期事项 🎉</div>;
  }

  return (
    <div className="overdue-list">
      {overdue.map((event) => (
        <button
          key={event.id}
          className="overdue-item"
          onClick={() => {
            selectDate(event.date);
            setPage("calendar");
          }}
          title="点击跳转到该日期"
        >
          <span className="overdue-title">{event.title}</span>
          <span className="overdue-date">
            <CalendarDays size={13} />
            {formatDate(event.date)}
          </span>
        </button>
      ))}
    </div>
  );
}

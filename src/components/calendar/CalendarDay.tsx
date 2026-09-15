import type { Event } from "../../types/event";
import { useAppStore } from "../../stores/appStore";
import { monthKey, todayISO } from "../../utils/date";
import { getEventStatus } from "../../utils/status";

const MAX_VISIBLE = 3;

export function CalendarDay({ iso, month, entries }: { iso: string; month: string; entries: Event[] }) {
  const selectedDate = useAppStore((s) => s.settings.selectedDate);
  const selectDate = useAppStore((s) => s.selectDate);
  const today = todayISO();

  const classes = ["day"];
  if (monthKey(iso) !== month) classes.push("muted");
  if (iso === selectedDate) classes.push("selected");
  if (iso === today) classes.push("is-today");

  const visible = entries.slice(0, MAX_VISIBLE);
  const overflow = entries.length - visible.length;

  return (
    <div className={classes.join(" ")} onClick={() => selectDate(iso)}>
      <div className="day-number">{new Date(`${iso}T00:00:00`).getDate()}</div>
      <div className="day-events">
        {visible.map((event) => (
          <span key={event.id} className={`day-event st-${getEventStatus(event, today)}`} title={event.title}>
            {event.title}
          </span>
        ))}
        {overflow > 0 && <span className="day-more">+{overflow} 项</span>}
      </div>
    </div>
  );
}

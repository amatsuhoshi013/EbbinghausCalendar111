import { useMemo } from "react";
import type { Event } from "../../types/event";
import { useAppStore } from "../../stores/appStore";
import { getCalendarDays, monthKey } from "../../utils/date";
import { CalendarDay } from "./CalendarDay";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function MonthCalendar() {
  const selectedDate = useAppStore((s) => s.settings.selectedDate);
  const events = useAppStore((s) => s.events);
  const month = monthKey(selectedDate);
  const days = useMemo(() => getCalendarDays(selectedDate), [selectedDate]);
  const byDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      const list = map.get(event.date);
      if (list) list.push(event);
      else map.set(event.date, [event]);
    }
    return map;
  }, [events]);

  return (
    <div className="calendar-grid">
      {WEEKDAYS.map((w) => (
        <div key={w} className="weekday">
          {w}
        </div>
      ))}
      {days.map((iso) => (
        <CalendarDay key={iso} iso={iso} month={month} entries={byDate.get(iso) ?? []} />
      ))}
    </div>
  );
}

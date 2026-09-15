import { useMemo } from "react";
import type { Event } from "../../types/event";
import { useAppStore } from "../../stores/appStore";
import { filterCalendarDays, getCalendarDays, monthKey } from "../../utils/date";
import { CalendarDay } from "./CalendarDay";

const WEEKDAYS_SUNDAY = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAYS_MONDAY = ["一", "二", "三", "四", "五", "六", "日"];

export function MonthCalendar({
  onCreate,
  onEdit,
  onMoveEvent,
}: {
  onCreate: (date: string) => void;
  onEdit: (event: Event) => void;
  onMoveEvent: (eventId: string, targetDate: string) => void;
}) {
  const selectedDate = useAppStore((s) => s.settings.selectedDate);
  const events = useAppStore((s) => s.events);
  const settings = useAppStore((s) => s.settings);
  const weekStartsOn = settings.weekStartsOn === "monday" ? 1 : 0;
  const month = monthKey(selectedDate);

  const days = useMemo(() => getCalendarDays(selectedDate, weekStartsOn), [selectedDate, weekStartsOn]);
  const visibleDays = useMemo(
    () =>
      filterCalendarDays(days, month, {
        showWeekends: settings.showWeekends ?? true,
        showAdjacentMonth: settings.showAdjacentMonth ?? true,
      }),
    [days, month, settings.showWeekends, settings.showAdjacentMonth],
  );
  const weekdays = weekStartsOn === 1 ? WEEKDAYS_MONDAY : WEEKDAYS_SUNDAY;
  const showWeekends = settings.showWeekends ?? true;

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
    <div className={`calendar-grid${showWeekends ? "" : " no-weekends"}`}>
      {weekdays
        .filter((_, index) => showWeekends || index < 5)
        .map((w) => (
          <div key={w} className="weekday">
            {w}
          </div>
        ))}
      {visibleDays.map((iso) => (
        <CalendarDay
          key={iso}
          iso={iso}
          month={month}
          entries={byDate.get(iso) ?? []}
          onCreate={onCreate}
          onEdit={onEdit}
          onMoveEvent={onMoveEvent}
        />
      ))}
    </div>
  );
}

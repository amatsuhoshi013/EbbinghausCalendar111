import { useState } from "react";
import type { Event } from "../../types/event";
import { useAppStore } from "../../stores/appStore";
import { eventColor } from "../../services/categories";
import { monthKey, todayISO } from "../../utils/date";
import { getEventStatus } from "../../utils/status";

const MAX_VISIBLE = 3;

export function CalendarDay({
  iso,
  month,
  entries,
  onCreate,
  onEdit,
  onMoveEvent,
}: {
  iso: string;
  month: string;
  entries: Event[];
  onCreate: (date: string) => void;
  onEdit: (event: Event) => void;
  onMoveEvent: (eventId: string, targetDate: string) => void;
}) {
  const selectedDate = useAppStore((s) => s.settings.selectedDate);
  const selectDate = useAppStore((s) => s.selectDate);
  const categories = useAppStore((s) => s.categories);
  const primaryColor = useAppStore((s) => s.settings.primaryColor ?? "#4a6cf7");
  const [dragOver, setDragOver] = useState(false);
  const today = todayISO();

  const classes = ["day"];
  if (monthKey(iso) !== month) classes.push("muted");
  if (iso === selectedDate) classes.push("selected");
  if (iso === today) classes.push("is-today");
  if (dragOver) classes.push("drop-target");

  const visible = entries.slice(0, MAX_VISIBLE);
  const overflow = entries.length - visible.length;

  return (
    <div
      className={classes.join(" ")}
      onClick={() => selectDate(iso)}
      onDoubleClick={() => onCreate(iso)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const eventId = e.dataTransfer.getData("text/plain");
        if (eventId) onMoveEvent(eventId, iso);
      }}
    >
      <div className="day-number">{new Date(`${iso}T00:00:00`).getDate()}</div>
      <div className="day-events">
        {visible.map((event) => (
          <span
            key={event.id}
            className={`day-event st-${getEventStatus(event, today)}`}
            style={{ borderLeftColor: eventColor(event, categories, primaryColor) }}
            title={`${event.title}（点击编辑）`}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData("text/plain", event.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(event);
            }}
          >
            {event.title}
          </span>
        ))}
        {overflow > 0 && <span className="day-more">+{overflow} 项</span>}
      </div>
    </div>
  );
}

import { useState } from "react";
import { CalendarHeader } from "../components/calendar/CalendarHeader";
import { MonthCalendar } from "../components/calendar/MonthCalendar";
import { DeleteDialog } from "../components/event/DeleteDialog";
import { EventDialog } from "../components/event/EventDialog";
import { EventList } from "../components/event/EventList";
import { MoveStrategyDialog } from "../components/event/MoveStrategyDialog";
import { useAppStore } from "../stores/appStore";
import type { Event } from "../types/event";

interface DialogState {
  initial?: Event | null;
  defaultDate?: string;
}

export function CalendarPage() {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ event: Event; date: string } | null>(null);
  const events = useAppStore((s) => s.events);
  const moveEvent = useAppStore((s) => s.moveEvent);

  const openCreate = (date?: string) => setDialog({ defaultDate: date });
  const openEdit = (event: Event) => setDialog({ initial: event });

  const handleMove = (eventId: string, targetDate: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    if (event.reviewPlanId) {
      setMoveTarget({ event, date: targetDate });
    } else {
      void moveEvent(eventId, targetDate);
    }
  };

  return (
    <div className="calendar-page">
      <section className="card calendar-card">
        <CalendarHeader />
        <MonthCalendar onCreate={openCreate} onEdit={openEdit} onMoveEvent={handleMove} />
      </section>
      <section className="card side-panel">
        <EventList onCreate={() => openCreate()} onEdit={openEdit} onDelete={setDeleteTarget} />
      </section>
      {dialog && (
        <EventDialog
          initial={dialog.initial}
          defaultDate={dialog.defaultDate}
          onClose={() => setDialog(null)}
        />
      )}
      {deleteTarget && <DeleteDialog event={deleteTarget} onClose={() => setDeleteTarget(null)} />}
      {moveTarget && (
        <MoveStrategyDialog
          event={moveTarget.event}
          targetDate={moveTarget.date}
          onClose={() => setMoveTarget(null)}
        />
      )}
    </div>
  );
}

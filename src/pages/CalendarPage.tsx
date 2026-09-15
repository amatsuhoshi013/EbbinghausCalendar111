import { useState } from "react";
import { CalendarHeader } from "../components/calendar/CalendarHeader";
import { MonthCalendar } from "../components/calendar/MonthCalendar";
import { EventDialog } from "../components/event/EventDialog";
import { EventList } from "../components/event/EventList";

export function CalendarPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <div className="calendar-page">
      <section className="card calendar-card">
        <CalendarHeader />
        <MonthCalendar />
      </section>
      <section className="card side-panel">
        <EventList onCreate={() => setDialogOpen(true)} />
      </section>
      {dialogOpen && <EventDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

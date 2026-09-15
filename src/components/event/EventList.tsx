import { Plus, RotateCcw } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import type { Event } from "../../types/event";
import { formatDate, todayISO } from "../../utils/date";
import { getEventStatus } from "../../utils/status";

const STATUS_LABEL: Record<string, string> = {
  done: "已完成",
  overdue: "逾期",
  today: "今日待办",
  future: "未来",
};

function occurrenceLabel(event: Event): string {
  if (event.reviewIndex === undefined) return "普通事项";
  return event.reviewIndex === 0 ? "Day 0 · 艾宾浩斯计划" : `第 ${event.reviewIndex} 次复习 · 艾宾浩斯计划`;
}

export function EventList({ onCreate }: { onCreate: () => void }) {
  const selectedDate = useAppStore((s) => s.settings.selectedDate);
  const events = useAppStore((s) => s.events);
  const toggleCompleted = useAppStore((s) => s.toggleCompleted);
  const deletePlan = useAppStore((s) => s.deletePlan);
  const gotoToday = useAppStore((s) => s.gotoToday);
  const today = todayISO();

  const entries = events
    .filter((e) => e.date === selectedDate)
    .sort(
      (a, b) =>
        (a.reviewPlanId ?? "").localeCompare(b.reviewPlanId ?? "") ||
        (a.reviewIndex ?? 0) - (b.reviewIndex ?? 0),
    );

  return (
    <div className="panel-inner">
      <div className="panel-head">
        <div>
          <h2>{formatDate(selectedDate)}</h2>
          <p className="panel-sub">{entries.length ? `${entries.length} 项安排` : "当天没有安排"}</p>
        </div>
        <div className="panel-actions">
          {selectedDate !== today && (
            <button className="btn ghost" onClick={gotoToday}>
              今天
            </button>
          )}
          <button className="btn primary" onClick={onCreate}>
            <Plus size={16} />
            新建计划
          </button>
        </div>
      </div>
      <div className="event-list">
        {entries.length === 0 && <div className="empty-hint">当天没有待办，可以点击「新建计划」开始。</div>}
        {entries.map((event) => {
          const status = getEventStatus(event, today);
          return (
            <article key={event.id} className="event-row">
              <div className="event-row-main">
                <div className="event-row-title">{event.title}</div>
                <div className="event-row-sub">
                  {occurrenceLabel(event)}
                  {event.description ? ` · ${event.description}` : ""}
                </div>
              </div>
              <span className={`pill ${status}`}>{STATUS_LABEL[status]}</span>
              <div className="event-row-actions">
                <button
                  className={event.completed ? "btn ghost" : "btn primary"}
                  onClick={() => void toggleCompleted(event.id)}
                >
                  {event.completed ? (
                    <>
                      <RotateCcw size={14} />
                      取消完成
                    </>
                  ) : (
                    "完成"
                  )}
                </button>
                {event.reviewPlanId && (
                  <button className="btn danger" onClick={() => void deletePlan(event.reviewPlanId!)}>
                    删除计划
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

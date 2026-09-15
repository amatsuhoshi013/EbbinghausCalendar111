import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import type { Event } from "../../types/event";
import { eventColor } from "../../services/categories";
import { formatDate, todayISO } from "../../utils/date";
import { getEventStatus } from "../../utils/status";

const STATUS_LABEL: Record<string, string> = {
  done: "已完成",
  overdue: "逾期",
  today: "今日待办",
  future: "未来",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "低",
  normal: "普通",
  high: "高",
};

function occurrenceLabel(event: Event): string {
  if (event.reviewIndex === undefined) return "普通事项";
  return event.reviewIndex === 0 ? "Day 0 · 艾宾浩斯计划" : `第 ${event.reviewIndex} 次复习 · 艾宾浩斯计划`;
}

export function EventList({
  onCreate,
  onEdit,
  onDelete,
}: {
  onCreate: () => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}) {
  const selectedDate = useAppStore((s) => s.settings.selectedDate);
  const events = useAppStore((s) => s.events);
  const categories = useAppStore((s) => s.categories);
  const toggleCompleted = useAppStore((s) => s.toggleCompleted);
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
            新建事项
          </button>
        </div>
      </div>
      <div className="event-list">
        {entries.length === 0 && (
          <div className="empty-hint">当天没有待办，点击「新建事项」或双击日历日期开始。</div>
        )}
        {entries.map((event) => {
          const status = getEventStatus(event, today);
          const color = eventColor(event, categories);
          const category = categories.find((c) => c.id === event.categoryId);
          return (
            <article
              key={event.id}
              className="event-row"
              style={{ borderLeftColor: color }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", event.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => onEdit(event)}
            >
              <div className="event-row-main">
                <div className="event-row-title">{event.title}</div>
                <div className="event-row-sub">
                  {occurrenceLabel(event)}
                  {category ? ` · ${category.name}` : ""}
                  {event.priority && event.priority !== "normal" ? ` · ${PRIORITY_LABEL[event.priority]}优先级` : ""}
                  {event.description ? ` · ${event.description}` : ""}
                </div>
              </div>
              <div className="event-row-side">
                <span className={`pill ${status}`}>{STATUS_LABEL[status]}</span>
                <div className="event-row-actions">
                  <button
                    className={event.completed ? "btn ghost" : "btn primary"}
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleCompleted(event.id);
                    }}
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
                  <button
                    className="btn ghost"
                    title="编辑"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(event);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="btn danger"
                    title="删除"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(event);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="panel-tip">单击事项编辑 · 拖拽到日历日期移动</p>
    </div>
  );
}

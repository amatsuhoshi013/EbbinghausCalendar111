import type { Event } from "../types/event";

export type EventStatus = "done" | "overdue" | "today" | "future";

/** 事项状态：已完成优先于日期比较（与 v1 原型语义一致）。 */
export function getEventStatus(event: Event, today: string): EventStatus {
  if (event.completed) return "done";
  if (event.date < today) return "overdue";
  if (event.date === today) return "today";
  return "future";
}

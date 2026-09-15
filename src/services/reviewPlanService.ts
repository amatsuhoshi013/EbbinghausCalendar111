import type { Event } from "../types/event";
import type { ReviewPlan, ReviewRule } from "../types/review";
import { addDays, diffDays } from "../utils/date";
import { generateReviewDates } from "../utils/ebbinghaus";
import { uid } from "../utils/id";

/** 按 reviewIndex 收集完成状态，重排日期时保留。 */
function completionByIndex(events: Event[], planId: string): Map<number, boolean> {
  const map = new Map<number, boolean>();
  for (const e of events) {
    if (e.reviewPlanId === planId && e.reviewIndex !== undefined) map.set(e.reviewIndex, e.completed);
  }
  return map;
}

/** 从新起始日按规则重算计划的全部事件，完成状态按复习序号保留，无关事件不动。 */
export function rescheduleReviewEvents(
  plan: ReviewPlan,
  rule: ReviewRule,
  events: Event[],
  newStartDate: string,
  now: Date = new Date(),
): { plan: ReviewPlan; events: Event[] } {
  const updatedAt = now.toISOString();
  const newPlan: ReviewPlan = { ...plan, startDate: newStartDate, updatedAt };
  const completions = completionByIndex(events, plan.id);
  const unrelated = events.filter((e) => e.reviewPlanId !== plan.id);
  const regenerated = generateReviewDates(newStartDate, rule.intervals).map((occ) => {
    const old = events.find((e) => e.reviewPlanId === plan.id && e.reviewIndex === occ.index);
    return {
      id: old?.id ?? uid(),
      title: newPlan.title,
      description: old?.description,
      date: occ.date,
      completed: completions.get(occ.index) ?? false,
      reviewPlanId: plan.id,
      reviewIndex: occ.index,
      categoryId: old?.categoryId,
      color: old?.color,
      priority: old?.priority,
      createdAt: old?.createdAt ?? updatedAt,
      updatedAt,
    };
  });
  return { plan: newPlan, events: [...unrelated, ...regenerated] };
}

/** 把某次复习从计划中脱离为普通事项（移动到新日期）。 */
export function detachReviewEvent(
  events: Event[],
  eventId: string,
  newDate: string,
  now: Date = new Date(),
): Event[] {
  const updatedAt = now.toISOString();
  return events.map((e) =>
    e.id === eventId
      ? { ...e, date: newDate, reviewPlanId: undefined, reviewIndex: undefined, updatedAt }
      : e,
  );
}

export type MoveReviewMode = "shift" | "detach";

/**
 * 移动某次复习到新日期。
 * - shift：整个计划平移相同的天数（从计划起始日重算，完成状态按序号保留）；
 * - detach：仅该次复习脱离计划，移到新日期成为普通事项。
 */
export function moveReviewEvent(
  plan: ReviewPlan,
  rule: ReviewRule,
  events: Event[],
  eventId: string,
  newDate: string,
  mode: MoveReviewMode,
  now: Date = new Date(),
): { plan: ReviewPlan; events: Event[] } {
  if (mode === "detach") {
    return { plan, events: detachReviewEvent(events, eventId, newDate, now) };
  }
  const target = events.find((e) => e.id === eventId);
  if (!target) return { plan, events };
  const offset = diffDays(plan.startDate, target.date);
  const newStart = addDays(newDate, -offset);
  return rescheduleReviewEvents(plan, rule, events, newStart, now);
}

import type { Category } from "../types/category";
import type { Event } from "../types/event";
import type { ReviewPlan } from "../types/review";
import { addDays, shortDate, toISODate, todayISO } from "../utils/date";
import { getEventStatus } from "../utils/status";

export type RangeKey = "today" | "week" | "month" | "all";

export interface RangeBounds {
  from: string;
  to: string;
}

/** 统计范围边界：本周按周日开始（与月历一致）；all 不过滤。 */
export function rangeBounds(range: RangeKey, today: string = todayISO()): RangeBounds {
  switch (range) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const day = new Date(`${today}T00:00:00`).getDay();
      const from = addDays(today, -day);
      return { from, to: addDays(from, 6) };
    }
    case "month": {
      const month = today.slice(0, 7);
      const last = new Date(`${month}-01T00:00:00`);
      last.setMonth(last.getMonth() + 1);
      last.setDate(0);
      return { from: `${month}-01`, to: toISODate(last) };
    }
    case "all":
      return { from: "", to: "" };
  }
}

function inRange(date: string, bounds: RangeBounds): boolean {
  if (bounds.from === "" && bounds.to === "") return true;
  return date >= bounds.from && date <= bounds.to;
}

export interface OverallStats {
  total: number;
  completed: number;
  uncompleted: number;
  overdue: number;
  /** 0-100 的整数百分比 */
  completionRate: number;
}

export function getOverallStats(events: Event[], range: RangeKey, today: string = todayISO()): OverallStats {
  const bounds = rangeBounds(range, today);
  const scoped = events.filter((e) => inRange(e.date, bounds));
  const completed = scoped.filter((e) => e.completed).length;
  const overdue = scoped.filter((e) => getEventStatus(e, today) === "overdue").length;
  return {
    total: scoped.length,
    completed,
    uncompleted: scoped.length - completed,
    overdue,
    completionRate: scoped.length ? Math.round((completed / scoped.length) * 100) : 0,
  };
}

export interface CategoryStats {
  categoryId?: string;
  name: string;
  color: string;
  total: number;
  completed: number;
  completionRate: number;
}

export function getCategoryStats(
  events: Event[],
  categories: Category[],
  range: RangeKey,
  today: string = todayISO(),
): CategoryStats[] {
  const bounds = rangeBounds(range, today);
  const scoped = events.filter((e) => inRange(e.date, bounds));
  const rows: CategoryStats[] = [];
  for (const category of categories) {
    const items = scoped.filter((e) => e.categoryId === category.id);
    rows.push({
      categoryId: category.id,
      name: category.name,
      color: category.color,
      total: items.length,
      completed: items.filter((e) => e.completed).length,
      completionRate: items.length ? Math.round((items.filter((e) => e.completed).length / items.length) * 100) : 0,
    });
  }
  const uncategorized = scoped.filter((e) => !e.categoryId);
  if (uncategorized.length) {
    rows.push({
      name: "未分类",
      color: "#94a3b8",
      total: uncategorized.length,
      completed: uncategorized.filter((e) => e.completed).length,
      completionRate: Math.round((uncategorized.filter((e) => e.completed).length / uncategorized.length) * 100),
    });
  }
  return rows.sort((a, b) => b.total - a.total);
}

export interface ReviewIndexStats {
  index: number;
  label: string;
  total: number;
  completed: number;
  rate: number;
}

export interface ReviewStats {
  planCount: number;
  eventCount: number;
  completed: number;
  completionRate: number;
  byIndex: ReviewIndexStats[];
}

/** 艾宾浩斯专项：计划总数、复习事项总数、完成率，以及每一轮（Day0/R1/R2…）的完成情况。 */
export function getReviewStats(events: Event[], reviewPlans: ReviewPlan[]): ReviewStats {
  const reviewEvents = events.filter((e) => e.reviewPlanId);
  const completed = reviewEvents.filter((e) => e.completed).length;
  const maxIndex = reviewEvents.reduce((max, e) => Math.max(max, e.reviewIndex ?? 0), 0);
  const byIndex: ReviewIndexStats[] = [];
  for (let index = 0; index <= maxIndex; index++) {
    const items = reviewEvents.filter((e) => e.reviewIndex === index);
    const done = items.filter((e) => e.completed).length;
    byIndex.push({
      index,
      label: index === 0 ? "Day 0" : `R${index}`,
      total: items.length,
      completed: done,
      rate: items.length ? Math.round((done / items.length) * 100) : 0,
    });
  }
  return {
    planCount: reviewPlans.length,
    eventCount: reviewEvents.length,
    completed,
    completionRate: reviewEvents.length ? Math.round((completed / reviewEvents.length) * 100) : 0,
    byIndex,
  };
}

/** 逾期事项（按日期从早到晚排序）。 */
export function getOverdueEvents(events: Event[], today: string = todayISO()): Event[] {
  return events
    .filter((e) => getEventStatus(e, today) === "overdue")
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface DailyPoint {
  date: string;
  label: string;
  due: number;
  completed: number;
  overdue: number;
  created: number;
  /** 当日到期的完成率 0-100；无到期事项时为 null */
  rate: number | null;
}

/** 最近 N 天（含今天）的每日统计，供趋势图使用。 */
export function getDailyTrend(events: Event[], days: number, today: string = todayISO()): DailyPoint[] {
  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const due = events.filter((e) => e.date === date);
    const completed = due.filter((e) => e.completed).length;
    points.push({
      date,
      label: shortDate(date),
      due: due.length,
      completed,
      overdue: due.filter((e) => !e.completed && date < today).length,
      created: events.filter((e) => toISODate(new Date(e.createdAt)) === date).length,
      rate: due.length ? Math.round((completed / due.length) * 100) : null,
    });
  }
  return points;
}

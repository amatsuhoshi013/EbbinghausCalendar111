import { describe, expect, it } from "vitest";
import { withDefaultCategories } from "../src/services/categories";
import {
  getCategoryStats,
  getDailyTrend,
  getOverallStats,
  getOverdueEvents,
  getReviewStats,
  rangeBounds,
} from "../src/services/statistics";
import type { Event } from "../src/types/event";
import type { ReviewPlan } from "../src/types/review";

const TODAY = "2026-09-15"; // 周二
const NOW = new Date("2026-09-15T00:00:00.000Z");
const ISO = NOW.toISOString();

let seq = 0;
const event = (date: string, completed = false, extra: Partial<Event> = {}): Event => ({
  id: `e-${seq++}`,
  title: `事项 ${date}`,
  date,
  completed,
  createdAt: ISO,
  updatedAt: ISO,
  ...extra,
});

describe("rangeBounds", () => {
  it("computes range boundaries", () => {
    expect(rangeBounds("today", TODAY)).toEqual({ from: "2026-09-15", to: "2026-09-15" });
    // 2026-09-15 是周二 → 本周从周日 9/13 到周六 9/19
    expect(rangeBounds("week", TODAY)).toEqual({ from: "2026-09-13", to: "2026-09-19" });
    expect(rangeBounds("month", TODAY)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(rangeBounds("all", TODAY)).toEqual({ from: "", to: "" });
  });
});

describe("getOverallStats", () => {
  const events = [
    event("2026-09-10", true), // 过去已完成
    event("2026-09-14", false), // 过去未完成 → 逾期
    event("2026-09-15", false), // 今日
    event("2026-09-20", false), // 未来
    event("2026-10-01", true), // 下月
  ];

  it("counts all events for range=all", () => {
    const stats = getOverallStats(events, "all", TODAY);
    expect(stats).toEqual({ total: 5, completed: 2, uncompleted: 3, overdue: 1, completionRate: 40 });
  });

  it("filters by range", () => {
    expect(getOverallStats(events, "today", TODAY).total).toBe(1);
    expect(getOverallStats(events, "month", TODAY).total).toBe(4);
    expect(getOverallStats(events, "week", TODAY).total).toBe(2);
  });
});

describe("getCategoryStats", () => {
  const categories = withDefaultCategories([], NOW);
  const study = categories.find((c) => c.name === "学习")!;

  it("groups by category with a 未分类 bucket", () => {
    const events = [
      event("2026-09-01", true, { categoryId: study.id }),
      event("2026-09-02", false, { categoryId: study.id }),
      event("2026-09-03", false),
    ];
    const rows = getCategoryStats(events, categories, "all", TODAY);
    const studyRow = rows.find((r) => r.categoryId === study.id)!;
    expect(studyRow).toMatchObject({ total: 2, completed: 1, completionRate: 50 });
    const uncat = rows.find((r) => r.name === "未分类")!;
    expect(uncat.total).toBe(1);
  });
});

describe("getReviewStats", () => {
  const plans: ReviewPlan[] = [
    { id: "p1", title: "计划A", startDate: "2026-09-09", ruleId: "r1", createdAt: ISO, updatedAt: ISO },
  ];

  it("counts plans and per-index completion", () => {
    const events = [
      event("2026-09-09", true, { reviewPlanId: "p1", reviewIndex: 0 }),
      event("2026-09-10", true, { reviewPlanId: "p1", reviewIndex: 1 }),
      event("2026-09-11", false, { reviewPlanId: "p1", reviewIndex: 2 }),
      event("2026-09-12", false),
    ];
    const stats = getReviewStats(events, plans);
    expect(stats.planCount).toBe(1);
    expect(stats.eventCount).toBe(3);
    expect(stats.completed).toBe(2);
    expect(stats.completionRate).toBe(67);
    expect(stats.byIndex.map((i) => i.label)).toEqual(["Day 0", "R1", "R2"]);
    expect(stats.byIndex[2]).toMatchObject({ total: 1, completed: 0, rate: 0 });
  });

  it("handles empty review data", () => {
    expect(getReviewStats([], []).eventCount).toBe(0);
  });
});

describe("getOverdueEvents", () => {
  it("returns only overdue events sorted by date", () => {
    const events = [
      event("2026-09-12", false),
      event("2026-09-08", false),
      event("2026-09-10", true), // 已完成不算逾期
      event("2026-09-20", false), // 未来不算
    ];
    const overdue = getOverdueEvents(events, TODAY);
    expect(overdue.map((e) => e.date)).toEqual(["2026-09-08", "2026-09-12"]);
  });
});

describe("getDailyTrend", () => {
  it("builds N days ending today, newest first position last", () => {
    const events = [
      event("2026-09-13", false),
      event("2026-09-14", true),
      event("2026-09-15", true),
    ];
    const points = getDailyTrend(events, 7, TODAY);
    expect(points).toHaveLength(7);
    expect(points[0].date).toBe("2026-09-09");
    expect(points[6].date).toBe("2026-09-15");
    expect(points[6]).toMatchObject({ due: 1, completed: 1, overdue: 0 });
    expect(points[5]).toMatchObject({ due: 1, completed: 1 });
    expect(points[4]).toMatchObject({ due: 1, completed: 0, overdue: 1, rate: 0 });
  });
});

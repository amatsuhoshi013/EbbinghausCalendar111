import { describe, expect, it } from "vitest";
import { detachReviewEvent, moveReviewEvent, rescheduleReviewEvents } from "../src/services/reviewPlanService";
import type { Event } from "../src/types/event";
import type { ReviewPlan, ReviewRule } from "../src/types/review";

const NOW = new Date("2026-09-15T00:00:00.000Z");

const plan: ReviewPlan = {
  id: "plan-1",
  title: "医学复习",
  startDate: "2026-09-09",
  ruleId: "rule-1",
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
};

const rule: ReviewRule = {
  id: "rule-1",
  name: "标准",
  intervals: [1, 2, 4, 7, 15],
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
};

/** 9/9 起始的标准计划：9/9(0), 9/10(1), 9/11(2), 9/13(3), 9/16(4), 9/24(5) */
function buildEvents(): Event[] {
  const dates = ["2026-09-09", "2026-09-10", "2026-09-11", "2026-09-13", "2026-09-16", "2026-09-24"];
  return dates.map((date, index) => ({
    id: `ev-${index}`,
    title: plan.title,
    date,
    completed: index === 3,
    reviewPlanId: plan.id,
    reviewIndex: index,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  }));
}

describe("rescheduleReviewEvents", () => {
  it("recomputes all dates from the new start date and keeps completion by reviewIndex", () => {
    const events = [...buildEvents(), { ...buildEvents()[0], id: "other", reviewPlanId: "plan-2" }];
    const result = rescheduleReviewEvents(plan, rule, events, "2026-09-20", NOW);
    const planEvents = result.events.filter((e) => e.reviewPlanId === plan.id);
    expect(planEvents.map((e) => e.date)).toEqual([
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-24",
      "2026-09-27",
      "2026-10-05",
    ]);
    expect(planEvents.find((e) => e.reviewIndex === 3)?.completed).toBe(true);
    expect(planEvents.find((e) => e.reviewIndex === 0)?.completed).toBe(false);
    expect(planEvents.every((e) => e.title === plan.title)).toBe(true);
    // 无关事件不动
    expect(result.events.find((e) => e.id === "other")?.date).toBe("2026-09-09");
    expect(result.plan.startDate).toBe("2026-09-20");
  });

  it("shrinks events when the rule has fewer intervals", () => {
    const shortRule: ReviewRule = { ...rule, intervals: [1, 2] };
    const result = rescheduleReviewEvents(plan, shortRule, buildEvents(), "2026-09-09", NOW);
    const planEvents = result.events.filter((e) => e.reviewPlanId === plan.id);
    expect(planEvents.map((e) => e.date)).toEqual(["2026-09-09", "2026-09-10", "2026-09-11"]);
  });
});

describe("detachReviewEvent", () => {
  it("moves the occurrence to a new date and detaches it from the plan", () => {
    const events = detachReviewEvent(buildEvents(), "ev-2", "2026-09-18", NOW);
    const moved = events.find((e) => e.id === "ev-2")!;
    expect(moved.date).toBe("2026-09-18");
    expect(moved.reviewPlanId).toBeUndefined();
    expect(moved.reviewIndex).toBeUndefined();
    expect(events.filter((e) => e.reviewPlanId === plan.id)).toHaveLength(5);
  });
});

describe("moveReviewEvent", () => {
  it("shift: moves the whole plan so the target lands on the new date", () => {
    const events = buildEvents();
    const result = moveReviewEvent(plan, rule, events, "ev-2", "2026-09-18", "shift", NOW);
    // ev-2 原距 Day0 2 天 → 新 Day0 = 9/16
    expect(result.plan.startDate).toBe("2026-09-16");
    const planEvents = result.events.filter((e) => e.reviewPlanId === plan.id);
    expect(planEvents.map((e) => e.date)).toEqual([
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
      "2026-09-20",
      "2026-09-23",
      "2026-10-01",
    ]);
    expect(planEvents.find((e) => e.reviewIndex === 3)?.completed).toBe(true);
  });

  it("detach: only the target moves and detaches", () => {
    const events = buildEvents();
    const result = moveReviewEvent(plan, rule, events, "ev-4", "2026-09-30", "detach", NOW);
    expect(result.plan.startDate).toBe(plan.startDate);
    expect(result.events.find((e) => e.id === "ev-4")?.date).toBe("2026-09-30");
    expect(result.events.find((e) => e.id === "ev-4")?.reviewPlanId).toBeUndefined();
    expect(result.events.filter((e) => e.reviewPlanId === plan.id)).toHaveLength(5);
  });
});

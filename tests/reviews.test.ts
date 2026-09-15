import { describe, expect, it } from "vitest";
import { createReviewPlanEntities, resolveRule } from "../src/services/reviews";
import type { ReviewRule } from "../src/types/review";
import { DEFAULT_INTERVALS } from "../src/utils/ebbinghaus";

const NOW = new Date("2026-09-15T00:00:00.000Z");

const rule = (intervals: number[]): ReviewRule => ({
  id: `rule-${intervals.join("-")}`,
  name: "标准",
  intervals,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
});

describe("resolveRule", () => {
  it("reuses an existing rule with identical intervals", () => {
    const existing = [rule([1, 2, 4, 7, 15])];
    const result = resolveRule([1, 2, 4, 7, 15], existing, NOW);
    expect(result.rule).toBe(existing[0]);
    expect(result.rules).toBe(existing);
  });

  it("creates a new rule for distinct intervals", () => {
    const result = resolveRule([1, 2, 7], [rule([1, 2, 4])], NOW);
    expect(result.rules).toHaveLength(2);
    expect(result.rule.name).toBe("自定义间隔");
  });

  it("names the default sequence 标准", () => {
    expect(resolveRule(DEFAULT_INTERVALS, [], NOW).rule.name).toBe("标准");
  });
});

describe("createReviewPlanEntities", () => {
  it("creates plan + rule + Day0/N review events", () => {
    const result = createReviewPlanEntities(
      { title: "英语单词", startDate: "2026-09-09", intervals: [1, 2, 4], note: "Unit 5" },
      [],
      NOW,
    );
    expect(result.rule.intervals).toEqual([1, 2, 4]);
    expect(result.plan.ruleId).toBe(result.rule.id);
    expect(result.events.map((e) => e.date)).toEqual([
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-13",
    ]);
    expect(result.events.map((e) => e.reviewIndex)).toEqual([0, 1, 2, 3]);
    expect(result.events.every((e) => !e.completed)).toBe(true);
    expect(result.events.every((e) => e.reviewPlanId === result.plan.id)).toBe(true);
    expect(result.events[0].description).toBe("Unit 5");
    expect(result.events[0].title).toBe("英语单词");
  });

  it("reuses the existing rule instead of duplicating", () => {
    const first = createReviewPlanEntities(
      { title: "A", startDate: "2026-09-01", intervals: [1, 2] },
      [],
      NOW,
    );
    const second = createReviewPlanEntities(
      { title: "B", startDate: "2026-09-02", intervals: [1, 2] },
      first.rules,
      NOW,
    );
    expect(second.rules).toHaveLength(1);
    expect(second.rule).toBe(first.rule);
  });
});

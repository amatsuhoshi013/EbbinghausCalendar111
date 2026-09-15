import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { migrateV1ToV2, validateV1State } from "../src/services/migration";
import type { V1State } from "../src/types/state";

const NOW = new Date("2026-09-15T00:00:00.000Z");

function loadFixture(): V1State {
  const raw = readFileSync(new URL("../Ebbinghaus_backup.json", import.meta.url), "utf-8");
  return JSON.parse(raw) as V1State;
}

describe("migrateV1ToV2（真实备份数据 fixture）", () => {
  const v2 = migrateV1ToV2(loadFixture(), NOW);

  it("preserves all 3 plans with stable ids and titles", () => {
    expect(v2.reviewPlans).toHaveLength(3);
    const titles = v2.reviewPlans.map((p) => p.title);
    expect(titles).toEqual(expect.arrayContaining(["药理拟胆碱药", "0830单词复习", "0909单词新学"]));
    for (const plan of v2.reviewPlans) expect(plan.startDate).toBe("2026-09-09");
  });

  it("deduplicates rules: identical intervals share one rule", () => {
    expect(v2.reviewRules).toHaveLength(1);
    expect(v2.reviewRules[0].intervals).toEqual([1, 2, 4, 7, 15]);
    expect(v2.reviewRules[0].name).toBe("标准");
    expect(new Set(v2.reviewPlans.map((p) => p.ruleId))).toEqual(new Set([v2.reviewRules[0].id]));
  });

  it("generates 6 events per plan (Day 0 + 5 reviews)", () => {
    expect(v2.events).toHaveLength(18);
    for (const plan of v2.reviewPlans) {
      const planEvents = v2.events.filter((e) => e.reviewPlanId === plan.id);
      expect(planEvents.map((e) => e.date)).toEqual([
        "2026-09-09",
        "2026-09-10",
        "2026-09-11",
        "2026-09-13",
        "2026-09-16",
        "2026-09-24",
      ]);
      expect(planEvents.map((e) => e.reviewIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it("maps completions onto the matching events", () => {
    const completed = v2.events.filter((e) => e.completed);
    expect(completed).toHaveLength(3);
    for (const event of completed) {
      expect(event.date).toBe("2026-09-13");
      expect(event.reviewIndex).toBe(3);
    }
  });

  it("carries settings and UI state", () => {
    expect(v2.settings.compactMode).toBe(true);
    expect(v2.settings.reviewMinutes).toBe(5);
    expect(v2.settings.selectedDate).toBe("2026-09-10");
    expect(v2.settings.currentView).toBe("month");
    expect(v2.settings.defaultRuleId).toBe(v2.reviewRules[0].id);
  });

  it("declares version 2 with empty new collections", () => {
    expect(v2.version).toBe(2);
    expect(v2.categories).toEqual([]);
    expect(v2.backgrounds).toEqual([]);
  });
});

describe("migrateV1ToV2（边界情况）", () => {
  const base = (): V1State => ({
    version: 1,
    settings: { defaultIntervals: [1, 2, 4, 7, 15], compactMode: true, reviewMinutes: 5 },
    plans: [],
    completions: {},
    selectedDate: "2026-09-15",
    currentView: "month",
  });

  it("creates separate rules for distinct interval sequences", () => {
    const v1 = base();
    v1.plans = [
      { id: "a", title: "A", startDate: "2026-09-01", intervals: [1, 2, 4], createdAt: "2026-09-01T00:00:00.000Z" },
      { id: "b", title: "B", startDate: "2026-09-01", intervals: [1, 2, 7], createdAt: "2026-09-01T00:00:00.000Z" },
    ];
    const v2 = migrateV1ToV2(v1, NOW);
    expect(v2.reviewRules).toHaveLength(2);
    expect(v2.reviewPlans[0].ruleId).not.toBe(v2.reviewPlans[1].ruleId);
  });

  it("handles empty intervals (Day 0 only)", () => {
    const v1 = base();
    v1.plans = [{ id: "a", title: "A", startDate: "2026-09-01", intervals: [], createdAt: "2026-09-01T00:00:00.000Z" }];
    const v2 = migrateV1ToV2(v1, NOW);
    expect(v2.events).toHaveLength(1);
    expect(v2.events[0].reviewIndex).toBe(0);
    expect(v2.reviewRules[0].intervals).toEqual([]);
  });

  it("keeps note as description and ignores stale completions", () => {
    const v1 = base();
    v1.plans = [{ id: "a", title: "A", startDate: "2026-09-01", intervals: [1], note: "备注", createdAt: "2026-09-01T00:00:00.000Z" }];
    v1.completions = { a: { "1999-01-01": true } }; // 不属于任何 occurrence，应被忽略
    const v2 = migrateV1ToV2(v1, NOW);
    expect(v2.events).toHaveLength(2);
    expect(v2.events[0].description).toBe("备注");
    expect(v2.events.every((e) => !e.completed)).toBe(true);
  });
});

describe("validateV1State", () => {
  it("rejects malformed input", () => {
    expect(() => validateV1State(null)).toThrow();
    expect(() => validateV1State({})).toThrow();
    expect(() => validateV1State({ version: 2, plans: [] })).toThrow();
    expect(() =>
      validateV1State({ version: 1, plans: [{ id: "a", title: "A", startDate: "not-a-date", intervals: [1] }] }),
    ).toThrow();
    expect(() =>
      validateV1State({ version: 1, plans: [{ id: "a", title: "A", startDate: "2026-09-01", intervals: [0] }] }),
    ).toThrow();
  });

  it("accepts the real backup file", () => {
    expect(() => validateV1State(loadFixture())).not.toThrow();
  });
});

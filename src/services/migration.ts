import type { Event } from "../types/event";
import type { ReviewPlan, ReviewRule } from "../types/review";
import type { V1Plan, V1State, V2State } from "../types/state";
import { todayISO } from "../utils/date";
import { DEFAULT_INTERVALS, generateReviewDates, isValidIntervals } from "../utils/ebbinghaus";
import { uid } from "../utils/id";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const intervalKey = (intervals: number[]) => intervals.join(",");

/** 校验运行时数据是否合法 v1 状态（用于导入的 JSON 等不可信输入）。 */
export function validateV1State(input: unknown): asserts input is V1State {
  if (typeof input !== "object" || input === null) throw new Error("无效的 v1 数据：不是对象");
  const v1 = input as Partial<V1State>;
  if (v1.version !== 1) throw new Error(`无效的 v1 数据：version 必须为 1（收到 ${String(v1.version)}）`);
  if (!Array.isArray(v1.plans)) throw new Error("无效的 v1 数据：缺少 plans 数组");
  for (const plan of v1.plans) {
    const p = plan as Partial<V1Plan>;
    if (typeof p.id !== "string" || !p.id) throw new Error("无效的 v1 数据：plan.id 缺失");
    if (typeof p.title !== "string") throw new Error("无效的 v1 数据：plan.title 缺失");
    if (typeof p.startDate !== "string" || !DATE_RE.test(p.startDate)) {
      throw new Error("无效的 v1 数据：plan.startDate 非法");
    }
    if (!isValidIntervals(p.intervals)) throw new Error("无效的 v1 数据：plan.intervals 非法");
  }
}

/**
 * v1（plan + completions）→ v2（Event / ReviewPlan / ReviewRule）。
 * 映射规则：
 * - 每个 v1 plan → 1 个 ReviewPlan（保留原 id）+ 按 intervals 生成 (1 Day0 + N 复习) 个 Event；
 * - 相同 intervals 序列的所有 plan 共用同一条 ReviewRule；
 * - completions[planId][date] 映射为对应 Event.completed；
 * - note → Event.description，title 原样保留（复习次数由 reviewIndex 表达）；
 * - 顶层 selectedDate / currentView 迁入 settings，行为不变。
 * 旧数据零丢失：所有 plan 与其每条完成记录都必须出现在结果中。
 */
export function migrateV1ToV2(v1: V1State, now: Date = new Date()): V2State {
  validateV1State(v1);
  const timestamp = now.toISOString();

  const reviewRules: ReviewRule[] = [];
  const ruleByKey = new Map<string, ReviewRule>();
  const ensureRule = (intervals: number[]): ReviewRule => {
    const key = intervalKey(intervals);
    let rule = ruleByKey.get(key);
    if (!rule) {
      rule = {
        id: uid(),
        name: key === intervalKey(DEFAULT_INTERVALS) ? "标准" : "自定义间隔",
        intervals: [...intervals],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      ruleByKey.set(key, rule);
      reviewRules.push(rule);
    }
    return rule;
  };

  const reviewPlans: ReviewPlan[] = [];
  const events: Event[] = [];

  for (const plan of v1.plans) {
    const rule = ensureRule(plan.intervals);
    reviewPlans.push({
      id: plan.id,
      title: plan.title,
      startDate: plan.startDate,
      ruleId: rule.id,
      createdAt: plan.createdAt ?? timestamp,
      updatedAt: plan.createdAt ?? timestamp,
    });

    for (const occurrence of generateReviewDates(plan.startDate, plan.intervals)) {
      events.push({
        id: uid(),
        title: plan.title,
        description: plan.note || undefined,
        date: occurrence.date,
        completed: v1.completions?.[plan.id]?.[occurrence.date] === true,
        reviewPlanId: plan.id,
        reviewIndex: occurrence.index,
        createdAt: plan.createdAt ?? timestamp,
        updatedAt: plan.createdAt ?? timestamp,
      });
    }
  }

  return {
    version: 2,
    categories: [],
    events,
    reviewPlans,
    reviewRules,
    settings: {
      defaultRuleId: v1.settings?.defaultIntervals
        ? ruleByKey.get(intervalKey(v1.settings.defaultIntervals))?.id
        : undefined,
      compactMode: v1.settings?.compactMode ?? true,
      reviewMinutes: v1.settings?.reviewMinutes ?? 5,
      selectedDate: v1.selectedDate ?? todayISO(),
      currentView: v1.currentView ?? "month",
    },
    backgrounds: [],
  };
}

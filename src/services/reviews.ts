import type { Event } from "../types/event";
import type { ReviewPlan, ReviewRule } from "../types/review";
import { DEFAULT_INTERVALS, generateReviewDates } from "../utils/ebbinghaus";
import { uid } from "../utils/id";

/** intervals 序列的稳定键：migration 与运行时共用同一去重口径。 */
export const intervalKey = (intervals: number[]) => intervals.join(",");

export interface ResolveRuleResult {
  rule: ReviewRule;
  /** 更新后的规则列表（若新建了规则则包含新规则） */
  rules: ReviewRule[];
}

/** 按 intervals 序列查找已有规则，没有则新建；[1,2,4,7,15] 命名为"标准"。 */
export function resolveRule(intervals: number[], rules: ReviewRule[], now: Date = new Date()): ResolveRuleResult {
  const key = intervalKey(intervals);
  const existing = rules.find((r) => intervalKey(r.intervals) === key);
  if (existing) return { rule: existing, rules };
  const rule: ReviewRule = {
    id: uid(),
    name: key === intervalKey(DEFAULT_INTERVALS) ? "标准" : "自定义间隔",
    intervals: [...intervals],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  return { rule, rules: [...rules, rule] };
}

export interface NewReviewPlanInput {
  title: string;
  startDate: string;
  intervals: number[];
  note?: string;
}

export interface ReviewPlanEntities {
  plan: ReviewPlan;
  rule: ReviewRule;
  /** 更新后的规则列表（可能新增了规则） */
  rules: ReviewRule[];
  /** Day 0 + 全部复习 Event，completed 均为 false */
  events: Event[];
}

/** 从输入创建艾宾浩斯计划的所有实体（plan + 复用/新建规则 + 生成的 events）。 */
export function createReviewPlanEntities(
  input: NewReviewPlanInput,
  rules: ReviewRule[],
  now: Date = new Date(),
): ReviewPlanEntities {
  const resolved = resolveRule(input.intervals, rules, now);
  const timestamp = now.toISOString();
  const plan: ReviewPlan = {
    id: uid(),
    title: input.title,
    startDate: input.startDate,
    ruleId: resolved.rule.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const events: Event[] = generateReviewDates(input.startDate, input.intervals).map((occurrence) => ({
    id: uid(),
    title: input.title,
    description: input.note || undefined,
    date: occurrence.date,
    completed: false,
    reviewPlanId: plan.id,
    reviewIndex: occurrence.index,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  return { plan, rule: resolved.rule, rules: resolved.rules, events };
}

import { addDays } from "./date";
import type { ReviewOccurrence } from "../types/review";

/** 默认复习时间点（距 Day 0 的天数）。 */
export const DEFAULT_INTERVALS = [1, 2, 4, 7, 15];

/**
 * 生成艾宾浩斯复习日期。
 * intervals 的语义：距起始日（Day 0）的偏移天数，不是相邻复习之间的间隔——
 * 例如 [1,2,4] 得到 D+1、D+2、D+4。此语义与 v1 原型一致，后续不得变更（否则需要数据迁移）。
 */
export function generateReviewDates(startDate: string, intervals: number[]): ReviewOccurrence[] {
  const occurrences: ReviewOccurrence[] = [{ type: "start", date: startDate, index: 0, gap: 0 }];
  intervals.forEach((gap, i) => {
    occurrences.push({ type: "review", date: addDays(startDate, gap), index: i + 1, gap });
  });
  return occurrences;
}

export function isValidIntervals(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((n) => Number.isFinite(n) && n > 0);
}

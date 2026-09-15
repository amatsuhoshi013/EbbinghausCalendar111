/**
 * 日历上的最小单元。
 * 普通事项：只有一个 Event。
 * 艾宾浩斯事项：一个 ReviewPlan 对应多个 Event（reviewPlanId + reviewIndex 关联）。
 */
export type Priority = "low" | "normal" | "high";

export interface Event {
  id: string;
  title: string;
  description?: string;
  /** 本地日期，格式 YYYY-MM-DD（全项目不做时区换算） */
  date: string;
  completed: boolean;
  categoryId?: string;
  /** 覆盖分类颜色；未设置时继承 category.color */
  color?: string;
  priority?: Priority;
  /** 属于某个艾宾浩斯计划时非空 */
  reviewPlanId?: string;
  /** 0 = Day 0（原始事项），1..N = 第 N 次复习 */
  reviewIndex?: number;
  createdAt: string;
  updatedAt: string;
}

/** 复习规则。intervals 的语义是"距 Day 0 的偏移天数"，与 v1 原型行为一致。 */
export interface ReviewRule {
  id: string;
  name: string;
  intervals: number[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewPlan {
  id: string;
  title: string;
  startDate: string;
  ruleId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewOccurrence {
  type: "start" | "review";
  date: string;
  index: number;
  /** 距起始日的偏移天数（start 为 0） */
  gap: number;
}

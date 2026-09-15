import type { Background } from "./background";
import type { Category } from "./category";
import type { Event } from "./event";
import type { ReviewPlan, ReviewRule } from "./review";
import type { Settings } from "./settings";

/** v2 顶层状态（Phase 13 的 JSON 导入导出也使用此结构）。 */
export interface V2State {
  version: 2;
  categories: Category[];
  events: Event[];
  reviewPlans: ReviewPlan[];
  reviewRules: ReviewRule[];
  settings: Settings;
  backgrounds: Background[];
}

/* ---------- v1（旧原型）结构，仅供 migration 使用 ---------- */

export interface V1Plan {
  id: string;
  title: string;
  startDate: string;
  intervals: number[];
  note?: string;
  createdAt: string;
}

export interface V1State {
  version: 1;
  settings?: {
    defaultIntervals: number[];
    compactMode: boolean;
    reviewMinutes: number;
  };
  plans: V1Plan[];
  completions?: Record<string, Record<string, unknown>>;
  selectedDate?: string;
  currentView?: "today" | "month";
}

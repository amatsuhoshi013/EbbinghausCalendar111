import type { Category } from "../types/category";
import type { Event } from "../types/event";
import { uid } from "../utils/id";

export interface DefaultCategoryDef {
  name: string;
  color: string;
}

export const DEFAULT_CATEGORIES: DefaultCategoryDef[] = [
  { name: "学习", color: "#4a6cf7" },
  { name: "工作", color: "#8b5cf6" },
  { name: "生活", color: "#22c55e" },
  { name: "考试", color: "#ef4444" },
  { name: "运动", color: "#f59e0b" },
  { name: "其他", color: "#64748b" },
];

/** 首次运行种下默认分类（幂等：categories 非空时原样返回）。 */
export function withDefaultCategories(categories: Category[], now: Date = new Date()): Category[] {
  if (categories.length > 0) return categories;
  const timestamp = now.toISOString();
  return DEFAULT_CATEGORIES.map((def) => ({
    id: uid(),
    name: def.name,
    color: def.color,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

/** 事件显示色：自身覆盖 > 分类色 > 默认色。 */
export function eventColor(event: Event, categories: Category[], fallback = "#4a6cf7"): string {
  if (event.color) return event.color;
  if (event.categoryId) {
    const category = categories.find((c) => c.id === event.categoryId);
    if (category) return category.color;
  }
  return fallback;
}

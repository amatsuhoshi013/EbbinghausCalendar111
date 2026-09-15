export type ThemeMode = "system" | "light" | "dark";

export interface Settings {
  /** 新建艾宾浩斯事项时默认使用的规则 */
  defaultRuleId?: string;
  compactMode: boolean;
  /** 每个复习事项预计分钟数（统计用） */
  reviewMinutes: number;
  /** UI 状态：自 v2 起随 settings 持久化（继承 v1 的顶层字段） */
  selectedDate: string;
  currentView: "today" | "month";
  theme?: ThemeMode;
}

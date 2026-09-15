export type ThemeMode = "system" | "light" | "dark";
export type FontScale = "small" | "normal" | "large" | "xlarge";
export type WeekStart = "sunday" | "monday";

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
  fontScale?: FontScale;
  weekStartsOn?: WeekStart;
  /** 主题色（同时驱动 --primary 与事件默认颜色） */
  primaryColor?: string;
  /** 日历显示设置 */
  showWeekends?: boolean;
  showAdjacentMonth?: boolean;
  /** 玻璃卡片：不透明度 0.5..1 与模糊 0..30px */
  cardOpacity?: number;
  cardBlur?: number;
  /** 当前底图（指向 backgrounds 数组；图片本体存于存储层的 blob 空间） */
  backgroundId?: string;
}

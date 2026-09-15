import type { Event } from "../types/event";
import type { V2State } from "../types/state";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLLECTIONS = ["events", "reviewPlans", "reviewRules", "categories", "backgrounds"] as const;

/** 校验运行时数据是否合法 v2 状态（导入的 JSON、损坏的存储数据等不可信输入）。 */
export function validateV2State(input: unknown): asserts input is V2State {
  if (typeof input !== "object" || input === null) throw new Error("无效的数据：不是对象");
  const s = input as Partial<V2State>;
  if (s.version !== 2) throw new Error(`无效的数据：version 必须为 2（收到 ${String(s.version)}）`);
  for (const key of COLLECTIONS) {
    if (!Array.isArray(s[key])) throw new Error(`无效的数据：${key} 必须是数组`);
  }
  if (typeof s.settings !== "object" || s.settings === null) throw new Error("无效的数据：缺少 settings");
  if (typeof s.settings.selectedDate !== "string" || !DATE_RE.test(s.settings.selectedDate)) {
    throw new Error("无效的数据：settings.selectedDate 非法");
  }
  for (const item of s.events as unknown[]) {
    const event = item as Partial<Event>;
    if (typeof event.id !== "string" || !event.id) throw new Error("无效的数据：event.id 缺失");
    if (typeof event.title !== "string") throw new Error("无效的数据：event.title 缺失");
    if (typeof event.date !== "string" || !DATE_RE.test(event.date)) throw new Error("无效的数据：event.date 非法");
    if (typeof event.completed !== "boolean") throw new Error("无效的数据：event.completed 非法");
  }
}

export function serializeState(state: V2State): string {
  return JSON.stringify(state, null, 2);
}

/** JSON → V2State：解析失败或校验不过都会抛错。 */
export function parseState(text: string): V2State {
  const parsed: unknown = JSON.parse(text);
  validateV2State(parsed);
  return parsed;
}

/** 下载当前状态为 JSON 备份文件。 */
export function downloadBackup(state: V2State): void {
  const blob = new Blob([serializeState(state)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Ebbinghaus_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

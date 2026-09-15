const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

/** 全项目日期统一使用 YYYY-MM-DD 本地日期，不涉及时区换算。 */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toISODate(d);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** toISO - fromISO 的天数差（整数，可为负）。 */
export function diffDays(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`).getTime();
  const to = new Date(`${toISO}T00:00:00`).getTime();
  return Math.round((to - from) / 86400000);
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`;
}

export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 返回给定日期所在月的完整月历格子（首尾补足整周），首列周日。 */
export function getCalendarDays(viewDate: string): string[] {
  const d = new Date(`${viewDate.slice(0, 7)}-01T00:00:00`);
  const year = d.getFullYear();
  const month = d.getMonth();
  const end = new Date(year, month + 1, 0);
  const startOffset = new Date(year, month, 1).getDay();
  const days: string[] = [];
  for (let i = startOffset; i > 0; i--) days.push(toISODate(new Date(year, month, 1 - i)));
  for (let day = 1; day <= end.getDate(); day++) days.push(toISODate(new Date(year, month, day)));
  const trailing = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= trailing; i++) days.push(toISODate(new Date(year, month + 1, i)));
  return days;
}

import type { Background } from "../types/background";
import type { FontScale, Settings, ThemeMode } from "../types/settings";

/** 字号档位 → 根元素 zoom（WebView2/Chromium 支持，随窗口整体缩放）。 */
export const FONT_ZOOM: Record<FontScale, string> = {
  small: "0.9",
  normal: "1",
  large: "1.1",
  xlarge: "1.2",
};

/** 纯函数：解析最终主题（system 时由调用方传入系统偏好）。 */
export function resolveTheme(theme: ThemeMode | undefined, systemDark: boolean): "dark" | "light" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return systemDark ? "dark" : "light";
}

const DEFAULT_PRIMARY = "#4a6cf7";

/** 把外观设置同步到根元素（data-theme / zoom / CSS 变量）。 */
export function applyAppearance(settings: Settings): void {
  const root = document.documentElement;
  root.style.zoom = FONT_ZOOM[settings.fontScale ?? "normal"];
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = resolveTheme(settings.theme, systemDark);

  const primary = settings.primaryColor || DEFAULT_PRIMARY;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-2", `color-mix(in srgb, ${primary} 82%, #000)`);
  root.style.setProperty("--card-opacity", String(settings.cardOpacity ?? 1));
  root.style.setProperty("--card-blur", `${settings.cardBlur ?? 0}px`);
}

/** 把底图参数同步到根元素（图片本身由 BackgroundLayer 提供 URL）。 */
export function applyBackground(meta: Background | undefined, imageUrl: string | null): void {
  const root = document.documentElement;
  root.style.setProperty("--bg-image", imageUrl ? `url("${imageUrl}")` : "none");
  root.style.setProperty("--bg-overlay", String(meta?.overlayOpacity ?? 0));
  root.style.setProperty("--bg-blur", `${meta?.blur ?? 0}px`);
  root.style.setProperty("--bg-brightness", String(meta?.brightness ?? 1));
}

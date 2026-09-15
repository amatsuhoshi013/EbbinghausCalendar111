import { useAppStore } from "../../stores/appStore";
import type { FontScale, ThemeMode } from "../../types/settings";

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

const FONT_OPTIONS: Array<{ value: FontScale; label: string }> = [
  { value: "small", label: "小" },
  { value: "normal", label: "中" },
  { value: "large", label: "大" },
  { value: "xlarge", label: "特大" },
];

const COLOR_PRESETS = [
  { name: "蓝", value: "#4a6cf7" },
  { name: "紫", value: "#8b5cf6" },
  { name: "绿", value: "#10b981" },
  { name: "橙", value: "#f59e0b" },
  { name: "红", value: "#ef4444" },
  { name: "青", value: "#0ea5e9" },
];

export function AppearanceSettings() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const theme = settings.theme ?? "system";
  const fontScale = settings.fontScale ?? "normal";
  const primaryColor = settings.primaryColor ?? "#4a6cf7";
  const cardOpacity = settings.cardOpacity ?? 1;
  const cardBlur = settings.cardBlur ?? 0;

  return (
    <div className="setting-list">
      <div className="setting-row">
        <span className="setting-label">主题</span>
        <div className="segment" role="radiogroup" aria-label="主题">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              role="radio"
              aria-checked={theme === option.value}
              className={`segment-option${theme === option.value ? " active" : ""}`}
              onClick={() => void updateSettings({ theme: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-label">主色</span>
        <div className="color-presets" role="radiogroup" aria-label="主色">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              role="radio"
              aria-checked={primaryColor === preset.value}
              aria-label={preset.name}
              title={preset.name}
              className={`color-preset${primaryColor === preset.value ? " active" : ""}`}
              style={{ background: preset.value }}
              onClick={() => void updateSettings({ primaryColor: preset.value })}
            />
          ))}
          <label className="color-custom" title="自定义颜色">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => void updateSettings({ primaryColor: e.target.value })}
            />
            自定义
          </label>
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-label">字号</span>
        <div className="segment" role="radiogroup" aria-label="字号">
          {FONT_OPTIONS.map((option) => (
            <button
              key={option.value}
              role="radio"
              aria-checked={fontScale === option.value}
              className={`segment-option${fontScale === option.value ? " active" : ""}`}
              onClick={() => void updateSettings({ fontScale: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-label">卡片透明度</span>
        <div className="slider-wrap">
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.05}
            value={cardOpacity}
            aria-label="卡片透明度"
            onChange={(e) => void updateSettings({ cardOpacity: Number(e.target.value) })}
          />
          <span className="slider-value">{Math.round(cardOpacity * 100)}%</span>
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-label">卡片模糊</span>
        <div className="slider-wrap">
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={cardBlur}
            aria-label="卡片模糊"
            onChange={(e) => void updateSettings({ cardBlur: Number(e.target.value) })}
          />
          <span className="slider-value">{cardBlur}px</span>
        </div>
      </div>
    </div>
  );
}

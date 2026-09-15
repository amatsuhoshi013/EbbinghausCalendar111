import { useAppStore } from "../../stores/appStore";
import type { WeekStart } from "../../types/settings";

const WEEK_OPTIONS: Array<{ value: WeekStart; label: string }> = [
  { value: "sunday", label: "周日开始" },
  { value: "monday", label: "周一开始" },
];

export function CalendarSettings() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const weekStartsOn = settings.weekStartsOn ?? "sunday";
  const showWeekends = settings.showWeekends ?? true;
  const showAdjacentMonth = settings.showAdjacentMonth ?? true;

  return (
    <div className="setting-list">
      <div className="setting-row">
        <span className="setting-label">一周起始日</span>
        <div className="segment" role="radiogroup" aria-label="一周起始日">
          {WEEK_OPTIONS.map((option) => (
            <button
              key={option.value}
              role="radio"
              aria-checked={weekStartsOn === option.value}
              className={`segment-option${weekStartsOn === option.value ? " active" : ""}`}
              onClick={() => void updateSettings({ weekStartsOn: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={showWeekends}
          onChange={(e) => void updateSettings({ showWeekends: e.target.checked })}
        />
        显示周末
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={showAdjacentMonth}
          onChange={(e) => void updateSettings({ showAdjacentMonth: e.target.checked })}
        />
        显示跨月日期
      </label>
    </div>
  );
}

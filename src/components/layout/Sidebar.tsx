import { useRef } from "react";
import { BarChart3, CalendarDays, Download, Settings, Upload } from "lucide-react";
import { downloadBackup, parseState } from "../../services/backup";
import { useAppStore } from "../../stores/appStore";

const NAV_ITEMS = [
  { icon: CalendarDays, label: "日历", active: true },
  { icon: BarChart3, label: "统计", disabled: true },
  { icon: Settings, label: "设置", disabled: true },
];

export function Sidebar() {
  const replaceState = useAppStore((s) => s.replaceState);
  const importRef = useRef<HTMLInputElement>(null);

  const exportJSON = () => {
    const state = useAppStore.getState();
    downloadBackup({
      version: 2,
      categories: state.categories,
      events: state.events,
      reviewPlans: state.reviewPlans,
      reviewRules: state.reviewRules,
      settings: state.settings,
      backgrounds: state.backgrounds,
    });
  };

  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const next = parseState(text);
      if (!window.confirm(`导入将替换当前全部数据（${next.events.length} 个事项）。确定继续吗？`)) return;
      await replaceState(next);
      window.alert("导入成功");
    } catch {
      window.alert("导入失败：文件不是本应用导出的有效 JSON 备份。");
    }
  };

  return (
    <div className="sidebar-inner">
      <div className="sidebar-brand">
        <h1>艾宾浩斯日程表</h1>
        <p>本地日历 · 复习计划</p>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ icon: Icon, label, active, disabled }) => (
          <button
            key={label}
            className={`nav-item${active ? " active" : ""}`}
            disabled={disabled}
            title={disabled ? "即将推出" : label}
          >
            <Icon size={18} />
            <span>{label}</span>
            {disabled && <em className="nav-tag">即将推出</em>}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="sidebar-data">
          <button className="btn ghost data-btn" onClick={exportJSON}>
            <Download size={14} />
            导出 JSON
          </button>
          <button className="btn ghost data-btn" onClick={() => importRef.current?.click()}>
            <Upload size={14} />
            导入 JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importJSON(file);
              e.target.value = "";
            }}
          />
        </div>
        <p className="data-hint">数据保存在本机</p>
      </div>
    </div>
  );
}

import { BarChart3, CalendarDays, Settings } from "lucide-react";

const NAV_ITEMS = [
  { icon: CalendarDays, label: "日历", active: true },
  { icon: BarChart3, label: "统计", disabled: true },
  { icon: Settings, label: "设置", disabled: true },
];

export function Sidebar() {
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
      <div className="sidebar-foot">数据保存在本机</div>
    </div>
  );
}

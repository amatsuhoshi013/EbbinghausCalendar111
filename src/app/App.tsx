import { useEffect } from "react";
import { AppShell } from "../components/layout/AppShell";
import { Sidebar } from "../components/layout/Sidebar";
import { CalendarPage } from "../pages/CalendarPage";
import { SettingsPage } from "../pages/SettingsPage";
import { StatisticsPage } from "../pages/StatisticsPage";
import { applyAppearance } from "../services/themeService";
import { useAppStore } from "../stores/appStore";

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const page = useAppStore((s) => s.page);
  const settings = useAppStore((s) => s.settings);

  // 外观设置（主题/字号/主色/玻璃参数）同步到根元素；跟随系统主题时监听系统变化
  useEffect(() => {
    const apply = () => applyAppearance(settings);
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings]);

  if (!ready) {
    return <div className="boot-hint">加载中…</div>;
  }

  const main =
    page === "statistics" ? <StatisticsPage /> : page === "settings" ? <SettingsPage /> : <CalendarPage />;

  return <AppShell sidebar={<Sidebar />} main={main} />;
}

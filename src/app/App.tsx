import { AppShell } from "../components/layout/AppShell";
import { Sidebar } from "../components/layout/Sidebar";
import { CalendarPage } from "../pages/CalendarPage";
import { StatisticsPage } from "../pages/StatisticsPage";
import { useAppStore } from "../stores/appStore";

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const page = useAppStore((s) => s.page);
  if (!ready) {
    return <div className="boot-hint">加载中…</div>;
  }
  return (
    <AppShell sidebar={<Sidebar />} main={page === "statistics" ? <StatisticsPage /> : <CalendarPage />} />
  );
}

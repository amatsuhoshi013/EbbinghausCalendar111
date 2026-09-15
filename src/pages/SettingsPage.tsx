import { AppearanceSettings } from "../components/settings/AppearanceSettings";
import { BackgroundSettings } from "../components/settings/BackgroundSettings";
import { CalendarSettings } from "../components/settings/CalendarSettings";
import { DataSettings } from "../components/settings/DataSettings";

export function SettingsPage() {
  return (
    <div className="settings-page">
      <section className="card">
        <div className="stats-card-head">
          <h2>外观</h2>
        </div>
        <AppearanceSettings />
      </section>
      <section className="card">
        <div className="stats-card-head">
          <h2>背景</h2>
        </div>
        <BackgroundSettings />
      </section>
      <section className="card">
        <div className="stats-card-head">
          <h2>日历</h2>
        </div>
        <CalendarSettings />
      </section>
      <section className="card">
        <div className="stats-card-head">
          <h2>数据</h2>
        </div>
        <DataSettings />
      </section>
      <p className="settings-foot">艾宾浩斯日程表 v0.3.0 · 所有设置自动保存到本机</p>
    </div>
  );
}

import type { ReactNode } from "react";

export function AppShell({ sidebar, main }: { sidebar: ReactNode; main: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">{sidebar}</aside>
      <main className="app-main">{main}</main>
    </div>
  );
}

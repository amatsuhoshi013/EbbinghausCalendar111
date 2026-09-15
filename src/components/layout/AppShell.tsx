import type { ReactNode } from "react";
import { useBackgroundImage } from "../../hooks/useBackgroundImage";

export function AppShell({ sidebar, main }: { sidebar: ReactNode; main: ReactNode }) {
  const { url } = useBackgroundImage();
  return (
    <div className="app-wrap">
      {url && <div className="background-layer" aria-hidden="true" />}
      <div className="app-shell">
        <aside className="sidebar">{sidebar}</aside>
        <main className="app-main">{main}</main>
      </div>
    </div>
  );
}

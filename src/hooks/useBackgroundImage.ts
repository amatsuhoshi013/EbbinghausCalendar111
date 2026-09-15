import { useEffect, useState } from "react";
import { applyBackground } from "../services/themeService";
import { getStorageAdapter, useAppStore } from "../stores/appStore";
import type { Background } from "../types/background";

/** 加载当前底图的 blob 并生成对象 URL；返回 URL 与元数据。 */
export function useBackgroundImage(): { url: string | null; meta: Background | undefined } {
  const backgroundId = useAppStore((s) => s.settings.backgroundId);
  const backgrounds = useAppStore((s) => s.backgrounds);
  const meta = backgrounds.find((b) => b.id === backgroundId);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    if (!backgroundId) return;
    void (async () => {
      const blob = await getStorageAdapter()?.loadBackgroundImage(backgroundId);
      if (!cancelled && blob) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [backgroundId]);

  useEffect(() => {
    applyBackground(meta, url);
  }, [meta, url]);

  return { url, meta };
}

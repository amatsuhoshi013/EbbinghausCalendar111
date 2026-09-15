import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { withDefaultCategories } from "./services/categories";
import { IndexedDBStorageAdapter } from "./services/storage";
import { setStorageAdapter, useAppStore } from "./stores/appStore";
import "./styles/variables.css";
import "./styles/global.css";

async function boot(): Promise<void> {
  const storage = new IndexedDBStorageAdapter();
  setStorageAdapter(storage);

  // 加载 v2 数据；若只有 v1 原型数据，adapter 内部会自动迁移并保存 v2。
  const loaded = await storage.load();
  if (loaded) {
    // 旧 v2 数据可能没有默认分类，启动时补齐（幂等）
    useAppStore.setState({ ...loaded, categories: withDefaultCategories(loaded.categories), ready: true });
  } else {
    useAppStore.setState({ ready: true });
  }

  const container = document.getElementById("root");
  if (container) {
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}

void boot();

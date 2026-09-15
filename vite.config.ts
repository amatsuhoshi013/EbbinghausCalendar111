import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";

// Phase 1 临时方案：app.js 是经典脚本（非 ESM），Vite 无法打包，
// 构建时原样复制到 dist。Phase 2 换成 React 入口后移除本插件。
function copyLegacyApp(): Plugin {
  return {
    name: "copy-legacy-app",
    apply: "build",
    closeBundle() {
      copyFileSync(resolve(import.meta.dirname, "app.js"), resolve(import.meta.dirname, "dist/app.js"));
    },
  };
}

export default defineConfig({
  plugins: [copyLegacyApp()],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});

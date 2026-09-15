import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { downloadBackup, parseState } from "../../services/backup";
import { useAppStore } from "../../stores/appStore";

export function DataSettings() {
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
    <div className="setting-list">
      <p className="panel-sub">
        备份文件包含事项、计划、分类与全部外观设置（底图图片请单独在「背景」中重新选择）。旧版 v1
        备份文件在导入时同样会自动识别。
      </p>
      <div className="setting-row">
        <span className="setting-label">数据备份</span>
        <div className="background-actions">
          <button className="btn primary" onClick={exportJSON}>
            <Download size={15} />
            导出 JSON
          </button>
          <button className="btn ghost" onClick={() => importRef.current?.click()}>
            <Upload size={15} />
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
      </div>
    </div>
  );
}

import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useAppStore } from "../../stores/appStore";

export function BackgroundSettings() {
  const backgrounds = useAppStore((s) => s.backgrounds);
  const backgroundId = useAppStore((s) => s.settings.backgroundId);
  const addBackground = useAppStore((s) => s.addBackground);
  const updateBackground = useAppStore((s) => s.updateBackground);
  const removeBackground = useAppStore((s) => s.removeBackground);
  const fileRef = useRef<HTMLInputElement>(null);
  const active = backgrounds.find((b) => b.id === backgroundId);

  const pickImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      window.alert("请选择图片文件");
      return;
    }
    void addBackground(file.name, file);
  };

  return (
    <div className="setting-list">
      <div className="setting-row">
        <span className="setting-label">背景图片</span>
        <div className="background-actions">
          <button className="btn primary" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={15} />
            {active ? "更换图片" : "选择图片"}
          </button>
          {active && (
            <button className="btn danger" onClick={() => void removeBackground(active.id)}>
              <Trash2 size={15} />
              移除背景
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) pickImage(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {active && (
        <>
          <p className="background-current">当前：{active.name}</p>
          <div className="setting-row">
            <span className="setting-label">蒙版</span>
            <div className="slider-wrap">
              <input
                type="range"
                min={0}
                max={0.8}
                step={0.05}
                value={active.overlayOpacity ?? 0}
                aria-label="蒙版不透明度"
                onChange={(e) => void updateBackground(active.id, { overlayOpacity: Number(e.target.value) })}
              />
              <span className="slider-value">{Math.round((active.overlayOpacity ?? 0) * 100)}%</span>
            </div>
          </div>
          <div className="setting-row">
            <span className="setting-label">模糊</span>
            <div className="slider-wrap">
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={active.blur ?? 0}
                aria-label="背景模糊"
                onChange={(e) => void updateBackground(active.id, { blur: Number(e.target.value) })}
              />
              <span className="slider-value">{active.blur ?? 0}px</span>
            </div>
          </div>
          <div className="setting-row">
            <span className="setting-label">亮度</span>
            <div className="slider-wrap">
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={active.brightness ?? 1}
                aria-label="背景亮度"
                onChange={(e) => void updateBackground(active.id, { brightness: Number(e.target.value) })}
              />
              <span className="slider-value">{Math.round((active.brightness ?? 1) * 100)}%</span>
            </div>
          </div>
        </>
      )}
      {!active && <p className="panel-sub">选择一张本地图片作为应用底图，配合玻璃卡片使用。</p>}
    </div>
  );
}

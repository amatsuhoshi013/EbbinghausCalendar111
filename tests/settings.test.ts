import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStorageAdapter } from "../src/services/storage";
import { createInitialV2State, setStorageAdapter, useAppStore } from "../src/stores/appStore";

let adapter: MemoryStorageAdapter;

beforeEach(() => {
  adapter = new MemoryStorageAdapter();
  setStorageAdapter(adapter);
  useAppStore.setState({ ...createInitialV2State(), ready: true });
});

describe("updateSettings", () => {
  it("merges patches and persists", async () => {
    await useAppStore.getState().updateSettings({ theme: "dark", cardOpacity: 0.7 });
    const state = useAppStore.getState();
    expect(state.settings).toMatchObject({ theme: "dark", cardOpacity: 0.7, fontScale: "normal" });
    expect(adapter.getSnapshot()?.settings).toMatchObject({ theme: "dark", cardOpacity: 0.7 });
  });
});

describe("background management", () => {
  const blob = new Blob(["fake-image"], { type: "image/png" });

  it("addBackground stores blob separately, keeps only metadata in state, and activates it", async () => {
    await useAppStore.getState().addBackground("壁纸.png", blob);
    const state = useAppStore.getState();
    expect(state.backgrounds).toHaveLength(1);
    const meta = state.backgrounds[0];
    expect(meta).toMatchObject({ name: "壁纸.png", overlayOpacity: 0, blur: 0, brightness: 1 });
    expect(JSON.stringify(meta)).not.toContain("fake-image"); // 图片本体不进 state
    expect(state.settings.backgroundId).toBe(meta.id);
    expect(await adapter.loadBackgroundImage(meta.id)).toBeInstanceOf(Blob);
  });

  it("updateBackground patches metadata and persists", async () => {
    await useAppStore.getState().addBackground("壁纸.png", blob);
    const id = useAppStore.getState().backgrounds[0].id;
    await useAppStore.getState().updateBackground(id, { blur: 12, brightness: 1.2 });
    expect(useAppStore.getState().backgrounds[0]).toMatchObject({ blur: 12, brightness: 1.2 });
    expect(adapter.getSnapshot()?.backgrounds[0]).toMatchObject({ blur: 12 });
  });

  it("removeBackground deletes blob and clears active id", async () => {
    await useAppStore.getState().addBackground("壁纸.png", blob);
    const id = useAppStore.getState().backgrounds[0].id;
    await useAppStore.getState().removeBackground(id);
    expect(useAppStore.getState().backgrounds).toHaveLength(0);
    expect(useAppStore.getState().settings.backgroundId).toBeUndefined();
    expect(await adapter.loadBackgroundImage(id)).toBeNull();
  });
});

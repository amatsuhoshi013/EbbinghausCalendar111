import { describe, expect, it } from "vitest";
import { validateV2State } from "../src/services/backup";
import { MemoryStorageAdapter } from "../src/services/storage";
import { createInitialV2State } from "../src/stores/appStore";

describe("MemoryStorageAdapter", () => {
  it("loads null before the first save", async () => {
    const adapter = new MemoryStorageAdapter();
    expect(await adapter.load()).toBeNull();
  });

  it("round-trips a full v2 state", async () => {
    const adapter = new MemoryStorageAdapter();
    const state = createInitialV2State();
    await adapter.save(state);
    const loaded = await adapter.load();
    expect(loaded).toEqual(state);
    expect(adapter.getSnapshot()).toEqual(state);
  });

  it("starts from an injected initial state", async () => {
    const state = createInitialV2State();
    const adapter = new MemoryStorageAdapter(state);
    expect(await adapter.load()).toBe(state);
  });
});

describe("StorageAdapter 契约（IndexedDB 实现的浏览器端行为由 E2E 覆盖）", () => {
  it("保存的状态必须通过 validateV2State 校验", async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.save(createInitialV2State());
    const loaded = await adapter.load();
    expect(() => validateV2State(loaded)).not.toThrow();
  });
});

import type { V2State } from "../types/state";

/**
 * 持久化适配器契约。
 * Phase 2 提供 IndexedDB 实现（沿用旧原型的存储逻辑），Phase 11 换成 SQLite。
 */
export interface StorageAdapter {
  load(): Promise<V2State | null>;
  save(state: V2State): Promise<void>;
}

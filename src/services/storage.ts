import type { V1State, V2State } from "../types/state";
import { isValidV2State } from "./backup";
import { migrateV1ToV2 } from "./migration";

/**
 * 持久化适配器契约。
 * UI 只依赖此接口，不感知底层存储：当前是 IndexedDB，Phase 11 换成 SQLite。
 */
export interface StorageAdapter {
  load(): Promise<V2State | null>;
  save(state: V2State): Promise<void>;
}

/** 内存实现：测试与降级用。 */
export class MemoryStorageAdapter implements StorageAdapter {
  private data: V2State | null;

  constructor(initial: V2State | null = null) {
    this.data = initial;
  }

  async load(): Promise<V2State | null> {
    return this.data;
  }

  async save(state: V2State): Promise<void> {
    this.data = state;
  }

  /** 测试用：读取最近一次保存的快照。 */
  getSnapshot(): V2State | null {
    return this.data;
  }
}

const V2_DB = "ebbinghaus-calendar-v2";
const V2_STORE = "appState";
const V2_KEY = "state";
/** v1 原型的数据库（只读，用于自动迁移）；两代库的 store 名相同。 */
const LEGACY_DB = "ebbinghaus-scheduler";
const LEGACY_KEY = "state";
const FALLBACK_KEY = "ebbinghaus-v2-fallback";

function openDB(name: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(V2_STORE)) db.createObjectStore(V2_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readKey(db: IDBDatabase, store: string, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function writeKey(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * IndexedDB 实现。
 * load 顺序：v2 库 → v1 原型库（自动迁移到 v2）→ localStorage 回退 → null。
 */
export class IndexedDBStorageAdapter implements StorageAdapter {
  async load(): Promise<V2State | null> {
    try {
      const v2 = await this.readIndexedDB(V2_DB, V2_KEY);
      if (v2 && isValidV2State(v2)) return v2;
      const legacy = await this.readIndexedDB(LEGACY_DB, LEGACY_KEY);
      if (legacy && (legacy as { version?: number }).version === 1) {
        const migrated = migrateV1ToV2(legacy as unknown as V1State);
        await this.save(migrated);
        return migrated;
      }
    } catch {
      // IndexedDB 不可用或数据损坏时落到 localStorage 回退
    }
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isValidV2State(parsed)) return parsed;
      }
    } catch {
      // 忽略损坏的回退数据
    }
    return null;
  }

  async save(state: V2State): Promise<void> {
    try {
      await this.writeIndexedDB(V2_DB, V2_KEY, state);
    } catch {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
    }
  }

  private async readIndexedDB(dbName: string, key: string): Promise<unknown> {
    if (typeof indexedDB === "undefined") return null;
    const db = await openDB(dbName, 1);
    const value = await readKey(db, V2_STORE, key);
    db.close();
    return value ?? null;
  }

  private async writeIndexedDB(dbName: string, key: string, value: V2State): Promise<void> {
    if (typeof indexedDB === "undefined") throw new Error("IndexedDB unavailable");
    const db = await openDB(dbName, 1);
    await writeKey(db, V2_STORE, key, value);
    db.close();
  }
}

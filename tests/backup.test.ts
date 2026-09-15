import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isValidV2State, parseState, serializeState, validateV2State } from "../src/services/backup";
import { migrateV1ToV2 } from "../src/services/migration";
import type { V1State, V2State } from "../src/types/state";

const NOW = new Date("2026-09-15T00:00:00.000Z");

function validState(): V2State {
  const raw = readFileSync(new URL("../Ebbinghaus_backup.json", import.meta.url), "utf-8");
  return migrateV1ToV2(JSON.parse(raw) as V1State, NOW);
}

describe("validateV2State", () => {
  it("accepts a migrated real-data state", () => {
    expect(() => validateV2State(validState())).not.toThrow();
  });

  it("rejects malformed input", () => {
    expect(() => validateV2State(null)).toThrow();
    expect(() => validateV2State({})).toThrow();
    expect(() => validateV2State({ ...validState(), version: 3 })).toThrow();
    const noEvents = { ...validState(), events: "not-array" } as unknown as V2State;
    expect(() => validateV2State(noEvents)).toThrow();
    const badDate = validState();
    badDate.events[0].date = "2026/09/01";
    expect(() => validateV2State(badDate)).toThrow();
    const badCompleted = validState();
    (badCompleted.events[0] as { completed: unknown }).completed = "yes";
    expect(() => validateV2State(badCompleted)).toThrow();
    const badSelected = validState();
    badSelected.settings.selectedDate = "tomorrow";
    expect(() => validateV2State(badSelected)).toThrow();
  });
});

describe("isValidV2State（存储层加载时的类型守卫）", () => {
  it("accepts valid and rejects invalid without throwing", () => {
    expect(isValidV2State(validState())).toBe(true);
    expect(isValidV2State(null)).toBe(false);
    expect(isValidV2State({ version: 3 })).toBe(false);
    const bad = validState();
    (bad.events[0] as { completed: unknown }).completed = "yes";
    expect(isValidV2State(bad)).toBe(false);
  });
});

describe("serializeState / parseState", () => {
  it("round-trips without data loss", () => {
    const state = validState();
    const restored = parseState(serializeState(state));
    expect(restored).toEqual(state);
    expect(restored.version).toBe(2);
    expect(restored.events).toHaveLength(18);
  });

  it("throws on invalid JSON or invalid shape", () => {
    expect(() => parseState("not json")).toThrow();
    expect(() => parseState('{"version": 2}')).toThrow();
  });
});

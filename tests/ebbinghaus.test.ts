import { describe, expect, it } from "vitest";
import { DEFAULT_INTERVALS, generateReviewDates, isValidIntervals } from "../src/utils/ebbinghaus";

describe("generateReviewDates", () => {
  it("treats intervals as absolute day offsets from Day 0", () => {
    const dates = generateReviewDates("2026-09-09", [1, 2, 4, 7, 15]).map((o) => o.date);
    expect(dates).toEqual([
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-13",
      "2026-09-16",
      "2026-09-24",
    ]);
  });

  it("assigns type / index / gap", () => {
    const occurrences = generateReviewDates("2026-09-09", [1, 2, 4]);
    expect(occurrences.map((o) => [o.type, o.index, o.gap])).toEqual([
      ["start", 0, 0],
      ["review", 1, 1],
      ["review", 2, 2],
      ["review", 3, 4],
    ]);
  });

  it("handles empty intervals (Day 0 only)", () => {
    expect(generateReviewDates("2026-09-09", [])).toEqual([
      { type: "start", date: "2026-09-09", index: 0, gap: 0 },
    ]);
  });

  it("crosses month and year boundaries", () => {
    const dates = generateReviewDates("2026-12-30", [2, 3]).map((o) => o.date);
    expect(dates).toEqual(["2026-12-30", "2027-01-01", "2027-01-02"]);
  });
});

describe("isValidIntervals", () => {
  it("accepts positive finite numbers (including empty array)", () => {
    expect(isValidIntervals([1, 2.5, 15])).toBe(true);
    expect(isValidIntervals([])).toBe(true);
  });

  it("rejects invalid input", () => {
    expect(isValidIntervals([0, 1])).toBe(false);
    expect(isValidIntervals([1, Number.NaN])).toBe(false);
    expect(isValidIntervals("1,2")).toBe(false);
    expect(isValidIntervals(undefined)).toBe(false);
  });
});

describe("DEFAULT_INTERVALS", () => {
  it("keeps the classic sequence", () => {
    expect(DEFAULT_INTERVALS).toEqual([1, 2, 4, 7, 15]);
  });
});

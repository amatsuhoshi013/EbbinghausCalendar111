import { describe, expect, it } from "vitest";
import { addDays, diffDays, getCalendarDays, monthKey, shortDate, toISODate, todayISO } from "../src/utils/date";

describe("toISODate", () => {
  it("formats with zero padding", () => {
    expect(toISODate(new Date(2026, 8, 15))).toBe("2026-09-15");
    expect(toISODate(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("addDays", () => {
  it("adds across day boundary", () => {
    expect(addDays("2026-09-09", 1)).toBe("2026-09-10");
    expect(addDays("2026-09-09", 15)).toBe("2026-09-24");
  });

  it("handles month and year rollover", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles leap year", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
  });
});

describe("monthKey / shortDate", () => {
  it("extracts year-month", () => {
    expect(monthKey("2026-09-15")).toBe("2026-09");
  });

  it("formats month/day", () => {
    expect(shortDate("2026-09-15")).toBe("9/15");
  });
});

describe("diffDays", () => {
  it("computes signed day differences", () => {
    expect(diffDays("2026-09-09", "2026-09-11")).toBe(2);
    expect(diffDays("2026-09-11", "2026-09-09")).toBe(-2);
    expect(diffDays("2026-09-09", "2026-09-09")).toBe(0);
    expect(diffDays("2026-09-30", "2026-10-01")).toBe(1);
    expect(diffDays("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("getCalendarDays", () => {
  it("returns complete weeks and starts on a Sunday", () => {
    const days = getCalendarDays("2026-09-15");
    expect(days.length % 7).toBe(0);
    expect(new Date(`${days[0]}T00:00:00`).getDay()).toBe(0);
  });

  it("contains every day of the month exactly once (non-leap February)", () => {
    const days = getCalendarDays("2026-02-15");
    const feb = days.filter((d) => monthKey(d) === "2026-02");
    expect(feb).toHaveLength(28);
    expect(feb[0]).toBe("2026-02-01");
    expect(feb[27]).toBe("2026-02-28");
  });

  it("covers a 31-day month", () => {
    const days = getCalendarDays("2026-09-15");
    expect(days.filter((d) => monthKey(d) === "2026-09")).toHaveLength(30);
  });
});

describe("todayISO", () => {
  it("matches the local date shape", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

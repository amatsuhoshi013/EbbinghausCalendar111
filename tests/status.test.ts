import { describe, expect, it } from "vitest";
import type { Event } from "../src/types/event";
import { getEventStatus } from "../src/utils/status";

const event = (date: string, completed: boolean): Event => ({
  id: "e",
  title: "t",
  date,
  completed,
  createdAt: "x",
  updatedAt: "x",
});

describe("getEventStatus", () => {
  const today = "2026-09-15";

  it("completed wins over date comparison", () => {
    expect(getEventStatus(event("2026-09-01", true), today)).toBe("done");
    expect(getEventStatus(event("2026-09-30", true), today)).toBe("done");
  });

  it("classifies overdue / today / future", () => {
    expect(getEventStatus(event("2026-09-14", false), today)).toBe("overdue");
    expect(getEventStatus(event("2026-09-15", false), today)).toBe("today");
    expect(getEventStatus(event("2026-09-16", false), today)).toBe("future");
  });
});

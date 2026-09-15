import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, eventColor, withDefaultCategories } from "../src/services/categories";
import type { Category } from "../src/types/category";
import type { Event } from "../src/types/event";

const NOW = new Date("2026-09-15T00:00:00.000Z");

const event = (overrides: Partial<Event> = {}): Event => ({
  id: "e",
  title: "t",
  date: "2026-09-15",
  completed: false,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

describe("withDefaultCategories", () => {
  it("seeds the six default categories when empty", () => {
    const seeded = withDefaultCategories([], NOW);
    expect(seeded.map((c) => c.name)).toEqual(["学习", "工作", "生活", "考试", "运动", "其他"]);
    expect(seeded.every((c) => c.color.startsWith("#"))).toBe(true);
  });

  it("is idempotent: keeps existing categories untouched", () => {
    const existing: Category[] = [
      { id: "c1", name: "自定义", color: "#123456", createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() },
    ];
    expect(withDefaultCategories(existing, NOW)).toBe(existing);
  });
});

describe("eventColor", () => {
  const categories = withDefaultCategories([], NOW);
  const study = categories.find((c) => c.name === "学习")!;

  it("prefers the event color override", () => {
    expect(eventColor(event({ color: "#111111", categoryId: study.id }), categories)).toBe("#111111");
  });

  it("falls back to the category color", () => {
    expect(eventColor(event({ categoryId: study.id }), categories)).toBe(study.color);
  });

  it("falls back to the default color when uncategorized", () => {
    expect(eventColor(event(), categories)).toBe("#4a6cf7");
    expect(eventColor(event({ categoryId: "missing" }), categories, "#000000")).toBe("#000000");
  });
});

describe("DEFAULT_CATEGORIES", () => {
  it("uses distinct colors", () => {
    const colors = new Set(DEFAULT_CATEGORIES.map((c) => c.color));
    expect(colors.size).toBe(DEFAULT_CATEGORIES.length);
  });
});

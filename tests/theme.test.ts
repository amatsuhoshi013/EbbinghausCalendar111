import { describe, expect, it } from "vitest";
import { FONT_ZOOM, resolveTheme } from "../src/services/themeService";

describe("resolveTheme", () => {
  it("returns explicit themes regardless of system", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("follows system preference for system/undefined", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme(undefined, true)).toBe("dark");
    expect(resolveTheme(undefined, false)).toBe("light");
  });
});

describe("FONT_ZOOM", () => {
  it("maps all font scales", () => {
    expect(FONT_ZOOM).toEqual({ small: "0.9", normal: "1", large: "1.1", xlarge: "1.2" });
  });
});

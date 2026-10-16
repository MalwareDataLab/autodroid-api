import { describe, expect, it } from "vitest";

// Target import
import { trimString } from ".";

describe("Utils: trimString", () => {
  it("should return an empty string when the value is falsy", () => {
    expect(trimString("")).toBe("");
  });

  it("should trim and collapse inner whitespace", () => {
    expect(trimString("  hello   world  ")).toBe("hello world");
  });
});

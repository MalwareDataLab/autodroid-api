import { describe, expect, it } from "vitest";

// Test target import
import { isValidCommaSeparatedString } from ".";

describe("Utils: isValidCommaSeparatedString", () => {
  it("should return true when every comma separated value is not empty", () => {
    expect(isValidCommaSeparatedString("tag1, tag2, tag3")).toBe(true);
  });

  it("should return false when the string is empty", () => {
    expect(isValidCommaSeparatedString("")).toBe(false);
  });

  it("should return false when any comma separated value is empty", () => {
    expect(isValidCommaSeparatedString("tag1,,tag3")).toBe(false);
  });
});

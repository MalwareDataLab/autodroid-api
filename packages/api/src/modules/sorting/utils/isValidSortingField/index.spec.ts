import { describe, expect, it } from "vitest";

// Test target import
import { isValidSortingField } from ".";

describe("Utils: isValidSortingField", () => {
  const options = ["created_at", "id"] as const;

  it("should return true when the field is part of the options", () => {
    expect(isValidSortingField("created_at", options)).toBe(true);
  });

  it("should return false when the field is not part of the options", () => {
    expect(isValidSortingField("name", options)).toBe(false);
  });
});

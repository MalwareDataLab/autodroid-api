import { describe, expect, it } from "vitest";

// Test target import
import { isValidEmail } from ".";

describe("Utils: isValidEmail", () => {
  it("should return true when the email is valid", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("should return false when the email is invalid", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});

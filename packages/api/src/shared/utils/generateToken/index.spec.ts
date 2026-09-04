import { describe, expect, it } from "vitest";

// Test target import
import { generateToken } from ".";

describe("Utils: generateToken", () => {
  it("should generate a token with the default length of 32", () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9]{32}$/);
  });

  it("should generate a token with the given length", () => {
    expect(generateToken(16)).toMatch(/^[A-Za-z0-9]{16}$/);
  });
});

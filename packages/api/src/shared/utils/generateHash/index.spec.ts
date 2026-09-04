import { describe, expect, it } from "vitest";

// Test target import
import { generateHash } from ".";

describe("Utils: generateHash", () => {
  it("should generate the sha256 hex digest of the given data", () => {
    expect(generateHash("autodroid")).toBe(
      "9653e58876e3c7cd28ca8cda39b99fc2215b9317c381872e6c93b17722d02e7a",
    );
  });

  it("should be deterministic for the same input", () => {
    expect(generateHash("same-input")).toBe(generateHash("same-input"));
  });

  it("should produce a 64 character hex string", () => {
    expect(generateHash("value")).toMatch(/^[0-9a-f]{64}$/);
  });
});

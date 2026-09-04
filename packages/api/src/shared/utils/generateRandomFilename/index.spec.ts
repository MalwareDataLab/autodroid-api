import { describe, expect, it } from "vitest";

// Test target import
import { generateRandomFilename } from ".";

describe("Utils: generateRandomFilename", () => {
  it("should append the original filename to a random prefix", () => {
    expect(generateRandomFilename("report.csv")).toMatch(
      /^\d+-[0-9a-f-]{36}-[0-9a-f]{128}-report\.csv$/,
    );
  });

  it("should produce a different value on each call", () => {
    expect(generateRandomFilename("report.csv")).not.toBe(
      generateRandomFilename("report.csv"),
    );
  });
});

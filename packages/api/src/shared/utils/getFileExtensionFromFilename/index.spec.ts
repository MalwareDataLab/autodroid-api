import { describe, expect, it } from "vitest";

// Test target import
import { getFileExtensionFromFilename } from ".";

describe("Utils: getFileExtensionFromFilename", () => {
  it("should return the extension of a simple filename", () => {
    expect(getFileExtensionFromFilename("report.csv")).toBe("csv");
  });

  it("should return the last extension of a multi dotted filename", () => {
    expect(getFileExtensionFromFilename("archive.tar.gz")).toBe("gz");
  });

  it("should return an empty string when there is no extension", () => {
    expect(getFileExtensionFromFilename("noextension")).toBe("");
  });
});

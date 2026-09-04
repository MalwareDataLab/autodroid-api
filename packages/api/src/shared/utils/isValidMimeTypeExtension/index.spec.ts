import { describe, expect, it } from "vitest";

// Enum import
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";

// Test target import
import { isValidMimeTypeExtension } from ".";

describe("Utils: isValidMimeTypeExtension", () => {
  it("should return true when the extension is valid for the mime type", () => {
    expect(
      isValidMimeTypeExtension({
        mimeType: MIME_TYPE.JPEG,
        extension: "jpg",
      }),
    ).toBe(true);
  });

  it("should return false when the extension is invalid for the mime type", () => {
    expect(
      isValidMimeTypeExtension({
        mimeType: MIME_TYPE.JPEG,
        extension: "png",
      }),
    ).toBe(false);
  });
});

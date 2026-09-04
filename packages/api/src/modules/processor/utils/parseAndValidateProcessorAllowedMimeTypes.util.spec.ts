import { describe, expect, it } from "vitest";

// i18n import
import { t } from "@shared/i18n";

// Test target import
import { validateAndGetProcessorAllowedMimeTypes } from "./parseAndValidateProcessorAllowedMimeTypes.util";

describe("Utils: validateAndGetProcessorAllowedMimeTypes", () => {
  it("should parse a single valid mime type", () => {
    expect(
      validateAndGetProcessorAllowedMimeTypes({
        allowed_mime_types: " image/png ",
        t,
      }),
    ).toEqual(["image/png"]);
  });

  it("should parse multiple valid mime types", () => {
    expect(
      validateAndGetProcessorAllowedMimeTypes({
        allowed_mime_types: "image/png, application/zip",
        t,
      }),
    ).toEqual(["image/png", "application/zip"]);
  });

  it("should throw when a mime type is empty", () => {
    expect(() =>
      validateAndGetProcessorAllowedMimeTypes({
        allowed_mime_types: "image/png,",
        t,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@parse_and_validate_processor_allowed_mime_types/INVALID_MIME_TYPES",
      }),
    );
  });

  it("should throw when a value is not a mime type", () => {
    expect(() =>
      validateAndGetProcessorAllowedMimeTypes({
        allowed_mime_types: "not-a-mime-type",
        t,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@parse_and_validate_processor_allowed_mime_types/INVALID_MIME_TYPES",
      }),
    );
  });

  it("should throw when a mime type is not in the allowed enum", () => {
    expect(() =>
      validateAndGetProcessorAllowedMimeTypes({
        allowed_mime_types: "text/html",
        t,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@parse_and_validate_processor_allowed_mime_types/INVALID_MIME_TYPES",
      }),
    );
  });
});

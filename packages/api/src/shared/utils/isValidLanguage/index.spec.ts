import { afterEach, describe, expect, it, vi } from "vitest";

// Test target import
import { isValidLanguage } from ".";

describe("Utils: isValidLanguage", () => {
  afterEach(() => {
    vi.doUnmock("is-language-code");
    vi.resetModules();
  });

  it("should return true for a valid language code", () => {
    expect(isValidLanguage("en")).toBe(true);
  });

  it("should return false for an invalid language code", () => {
    expect(isValidLanguage("zz")).toBe(false);
  });

  it("should return false when the language check throws", async () => {
    vi.resetModules();
    vi.doMock("is-language-code", () => ({
      isLangCode: () => {
        throw new Error("unexpected");
      },
    }));

    const { isValidLanguage: isValidLanguageMocked } = await import("./index");

    expect(isValidLanguageMocked("en")).toBe(false);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

// Error import
import { AppError } from "@shared/errors/AppError";

// Target import
import { i18n, i18next, t, DEFAULT_LANGUAGE } from ".";

const stubClone = () => {
  const changeLanguage = vi.fn().mockResolvedValue(vi.fn());
  vi.spyOn(i18next, "cloneInstance").mockReturnValue({
    changeLanguage,
  } as any);
  return changeLanguage;
};

describe("i18n", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should translate against an initialized instance", async () => {
    await vi.waitFor(() => expect(i18next.isInitialized).toBe(true));
    expect(t("some.key")).toBe("some.key");
  });

  it("should request the language it was given", async () => {
    const changeLanguage = stubClone();

    await i18n("pt-br");

    expect(changeLanguage).toHaveBeenCalledWith("pt-br");
  });

  it("should request the default language when none is given", async () => {
    const changeLanguage = stubClone();

    await i18n();

    expect(changeLanguage).toHaveBeenCalledWith(DEFAULT_LANGUAGE);
  });

  it("should request the default language when the language is empty", async () => {
    const changeLanguage = stubClone();

    await i18n("");

    expect(changeLanguage).toHaveBeenCalledWith(DEFAULT_LANGUAGE);
  });

  it("should clone the instance rather than mutate the shared one", async () => {
    stubClone();

    await i18n("en");

    expect(i18next.cloneInstance).toHaveBeenCalledWith({
      initImmediate: false,
    });
  });

  it("should resolve the translation function produced by the clone", async () => {
    const translate = vi.fn();
    vi.spyOn(i18next, "cloneInstance").mockReturnValue({
      changeLanguage: vi.fn().mockResolvedValue(translate),
    } as any);

    await expect(i18n("en")).resolves.toBe(translate);
  });

  it("should raise a typed error when loading translations fails", async () => {
    vi.spyOn(i18next, "cloneInstance").mockImplementation(() => {
      throw new Error("clone failure");
    });

    await expect(i18n("en")).rejects.toMatchObject({
      key: "@i18n/FAIL",
      statusCode: 500,
    });
    await expect(i18n("en")).rejects.toBeInstanceOf(AppError);
  });
});

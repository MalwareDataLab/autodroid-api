import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import * as Sentry from "@sentry/node";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { logger } from "@shared/utils/logger";

// Error import
import { AppError } from "./AppError";

vi.mock("@sentry/node", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));
vi.mock("@shared/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

const setEnv = (env: Record<string, unknown>) =>
  (getEnvConfig as Mock).mockReturnValue(env);

describe("Error: AppError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv({ isTestEnv: true });
  });

  it("should build the error with a default status code of 400", async () => {
    const error = new AppError({ key: "@test/KEY", message: "message" });
    await error.action;

    expect(error.key).toBe("@test/KEY");
    expect(error.name).toBe("@test/KEY");
    expect(error.message).toBe("message");
    expect(error.statusCode).toBe(400);
    expect(error.errorCode).toMatch(/[0-9a-f-]{36}/);
    expect(error.debug).toBeUndefined();
  });

  it("should default the status code to 500 when a debug payload is present", async () => {
    const error = new AppError({
      key: "@test/KEY",
      message: "message",
      debug: { reason: "boom" },
    });
    await error.action;

    expect(error.statusCode).toBe(500);
    expect(error.debug).toMatchObject({
      reason: "boom",
      error_code: error.errorCode,
    });
  });

  it("should honor an explicit status code", async () => {
    const error = new AppError({
      key: "@test/KEY",
      message: "message",
      statusCode: 404,
    });
    await error.action;

    expect(error.statusCode).toBe(404);
  });

  it("should build an empty error when no params are provided", async () => {
    const error = new AppError();
    await error.action;

    expect(error.key).toBeUndefined();
    expect(error.statusCode).toBeUndefined();
  });

  it("should not report to Sentry on the test environment", async () => {
    const error = new AppError({
      key: "@test/KEY",
      message: "message",
      debug: { reason: "boom" },
    });
    await error.action;

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("should report to Sentry and log when outside the test environment with debug enabled", async () => {
    setEnv({ isTestEnv: false, DEBUG: "true" });

    const error = new AppError({
      key: "@test/KEY",
      message: "message",
      debug: { reason: "boom" },
    });
    await error.action;

    expect(Sentry.addBreadcrumb).toHaveBeenCalledOnce();
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("should report to Sentry without logging when debug flag is off", async () => {
    setEnv({ isTestEnv: false, DEBUG: "false" });

    const error = new AppError({
      key: "@test/KEY",
      message: "message",
      statusCode: 500,
    });
    await error.action;

    expect(Sentry.captureException).toHaveBeenCalledOnce();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("should not report when register is disabled", async () => {
    setEnv({ isTestEnv: false });

    const error = new AppError({
      key: "@test/KEY",
      message: "message",
      debug: { disableRegister: true },
    });
    await error.action;

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("should create an instance through the static make helper", async () => {
    const error = AppError.make({ key: "@test/KEY", message: "message" });
    await error.action;

    expect(error).toBeInstanceOf(AppError);
  });

  describe("isInstance", () => {
    it("should return false for a falsy value", () => {
      expect(AppError.isInstance(null)).toBe(false);
    });

    it("should return true for an AppError instance", () => {
      expect(
        AppError.isInstance(new AppError({ key: "@test/KEY", message: "m" })),
      ).toBe(true);
    });

    it("should return true for an object flagged as an AppError handler", () => {
      expect(AppError.isInstance({ handler: "AppError" })).toBe(true);
    });

    it("should return true for an object whose handler matches the prototype name", () => {
      expect(AppError.isInstance({ handler: "Error" })).toBe(true);
    });

    it("should return false for an object with a different handler", () => {
      expect(AppError.isInstance({ handler: "Other" })).toBe(false);
    });
  });
});

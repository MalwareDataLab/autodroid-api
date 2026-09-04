import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Package import
import APP_INFO from "@/package.json";

// Configuration import
import { getEnvConfig } from "@config/env";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";

// Target import
import { getSentryConfig } from "./sentry";

vi.mock("@config/env", () => ({
  getEnvConfig: vi.fn(() => ({ isTestEnv: true })),
}));

const getEnvConfigMock = vi.mocked(getEnvConfig);

const baseEnv = getEnvConfigMockValue({
  isTestEnv: true,
  SENTRY_DSN: "https://dsn",
  APP_ENV: "staging",
  APP_INFO: { ...APP_INFO, version: "1.2.3" },
});

describe("Config: getSentryConfig", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    getEnvConfigMock.mockReturnValue(baseEnv);
  });

  afterEach(() => {
    if (originalNodeEnv === undefined)
      delete (process.env as Record<string, unknown>).NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it("should build the base config using APP_ENV as environment", () => {
    const config = getSentryConfig();

    expect(config.dsn).toBe("https://dsn");
    expect(config.environment).toBe("staging");
    expect(config.release).toBe("1.2.3");
    expect(config.tracesSampleRate).toBe(0.1);
    // eslint-disable-next-line deprecation/deprecation
    expect(config.profilesSampleRate).toBe(0.1);
  });

  it("should fall back to NODE_ENV when APP_ENV is unset", () => {
    process.env.NODE_ENV = "qa-node-env";
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({ ...baseEnv, APP_ENV: undefined }),
    );

    expect(getSentryConfig().environment).toBe("qa-node-env");
  });

  it("beforeSend should keep the event when there is no exception", () => {
    const event = { id: "e" } as any;

    expect(getSentryConfig().beforeSend!(event, {} as any)).toBe(event);
  });

  it("beforeSend should keep the event for non-AppError exceptions", () => {
    const event = { id: "e" } as any;

    expect(
      getSentryConfig().beforeSend!(event, {
        originalException: new Error("plain"),
      } as any),
    ).toBe(event);
  });

  it("beforeSend should drop AppError without debug", () => {
    const event = { id: "e" } as any;
    const appError = new AppError({ key: "@t/K", message: "m" });

    expect(
      getSentryConfig().beforeSend!(event, {
        originalException: appError,
      } as any),
    ).toBeNull();
  });

  it("beforeSend should drop AppError with debug but statusCode < 500", () => {
    const event = { id: "e" } as any;
    const appError = new AppError({
      key: "@t/K",
      message: "m",
      statusCode: 400,
      debug: { foo: "bar" },
    });

    expect(
      getSentryConfig().beforeSend!(event, {
        originalException: appError,
      } as any),
    ).toBeNull();
  });

  it("beforeSend should keep AppError with debug and statusCode >= 500", () => {
    const event = { id: "e" } as any;
    const appError = new AppError({
      key: "@t/K",
      message: "m",
      debug: { foo: "bar" },
    });

    expect(
      getSentryConfig().beforeSend!(event, {
        originalException: appError,
      } as any),
    ).toBe(event);
  });
});

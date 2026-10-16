import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Util import
import { logger } from "@shared/utils/logger";

// Target import
import { getSessionConfig } from "./session";

vi.mock("@shared/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));
vi.mock("redis", () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(() => Promise.reject(new Error("redis"))),
  })),
}));
vi.mock("connect-redis", () => ({ RedisStore: vi.fn() }));
vi.mock("./redis", () => ({
  getRedisConfig: vi.fn(() => ({
    host: "redis-host",
    port: 6379,
    username: undefined,
    password: undefined,
    db: 0,
  })),
}));

const loggerMock = vi.mocked(logger);

describe("Config: getSessionConfig", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSessionSecret = process.env.SESSION_SECRET;
  const originalAppUrl = process.env.APP_URL;

  const restore = (key: string, value: string | undefined) => {
    if (value === undefined)
      delete (process.env as Record<string, unknown>)[key];
    else process.env[key] = value;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_SECRET = "session-secret";
    delete (process.env as Record<string, unknown>).APP_URL;
  });

  afterEach(() => {
    restore("NODE_ENV", originalNodeEnv);
    restore("SESSION_SECRET", originalSessionSecret);
    restore("APP_URL", originalAppUrl);
  });

  it("should throw when SESSION_SECRET is not set", () => {
    delete (process.env as Record<string, unknown>).SESSION_SECRET;

    expect(() => getSessionConfig()).toThrowError(
      "SESSION_SECRET environment variable is required",
    );
  });

  it("should build a non-secure config with no domain outside production", () => {
    process.env.NODE_ENV = "development";

    const config = getSessionConfig();

    expect(config).toMatchObject({
      name: "session",
      secret: "session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "none",
        domain: undefined,
      },
    });
    expect(config.store).toBeDefined();
  });

  it("should keep the domain undefined in production when APP_URL is unset", () => {
    process.env.NODE_ENV = "production";

    const config = getSessionConfig();

    expect(config.cookie?.secure).toBe(true);
    expect(config.cookie?.domain).toBeUndefined();
  });

  it("should derive the main domain from a multi-label APP_URL host", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://api.example.com";

    expect(getSessionConfig().cookie?.domain).toBe(".example.com");
  });

  it("should use the full hostname when APP_URL host has a single label", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "http://localhost";

    expect(getSessionConfig().cookie?.domain).toBe(".localhost");
  });

  it("should warn and return no domain when APP_URL cannot be parsed", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "not a url";

    expect(getSessionConfig().cookie?.domain).toBeUndefined();
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("Failed to parse APP_URL"),
    );
  });
});

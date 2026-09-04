import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";

// Target import
import { getRedisConfig } from "./redis";

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

const getEnvConfigMock = vi.mocked(getEnvConfig);

describe("Config: getRedisConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should map env vars, keeping username/password/db when provided", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        REDIS_HOST: "redis-host",
        REDIS_PORT: "6380",
        REDIS_USER: "user",
        REDIS_PASS: "pass",
        REDIS_DB: "3",
      }),
    );

    const config = getRedisConfig();

    expect(config.host).toBe("redis-host");
    expect(config.port).toBe(6380);
    expect(config.username).toBe("user");
    expect(config.password).toBe("pass");
    expect(config.db).toBe(3);
    expect(config.connectTimeout).toBe(5000);
    expect(config.keyPrefix).toBeUndefined();
    expect((config.retryStrategy as () => number)()).toBe(2000);
    expect((config.reconnectOnError as () => boolean)()).toBe(true);
  });

  it("should fall back to undefined credentials and db 0 when unset", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        REDIS_HOST: "redis-host",
        REDIS_PORT: "6379",
        REDIS_USER: "",
        REDIS_PASS: "",
        REDIS_DB: "",
      }),
    );

    const config = getRedisConfig();

    expect(config.username).toBeUndefined();
    expect(config.password).toBeUndefined();
    expect(config.db).toBe(0);
  });
});

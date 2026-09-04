import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";

// Target import
import { getWorkerConfig } from "./worker";

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

const getEnvConfigMock = vi.mocked(getEnvConfig);

describe("Config: getWorkerConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should map token secrets and parse a numeric max concurrent jobs", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        WORKER_REFRESH_TOKEN_SECRET: "refresh-secret",
        WORKER_REFRESH_TOKEN_EXPIRATION: "7d",
        WORKER_ACCESS_TOKEN_SECRET: "access-secret",
        WORKER_ACCESS_TOKEN_EXPIRATION: "15m",
        WORKER_MAX_CONCURRENT_JOBS: "4",
      }),
    );

    expect(getWorkerConfig()).toEqual({
      worker_refresh_token_secret: "refresh-secret",
      worker_refresh_token_expiration: "7d",
      worker_refresh_token_audience: "worker-refresh-token",
      worker_access_token_secret: "access-secret",
      worker_access_token_expiration: "15m",
      worker_access_token_audience: "worker-access-token",
      worker_max_concurrent_jobs: 4,
    });
  });

  it("should default max concurrent jobs to 1 when not a numeric string", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({ WORKER_MAX_CONCURRENT_JOBS: "not-a-number" }),
    );

    expect(getWorkerConfig().worker_max_concurrent_jobs).toBe(1);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";

// Target import
import { getCorsConfig } from "./cors";

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

const getEnvConfigMock = vi.mocked(getEnvConfig);

describe("Config: getCorsConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should split CORS_ALLOWED_FROM into an origin list in production", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        NODE_ENV: "production",
        CORS_ALLOWED_FROM: "https://a.com,https://b.com",
      }),
    );

    expect(getCorsConfig()).toEqual({
      origin: ["https://a.com", "https://b.com"],
      credentials: true,
    });
  });

  it("should allow all origins outside production", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        NODE_ENV: "development",
        CORS_ALLOWED_FROM: "https://a.com",
      }),
    );

    expect(getCorsConfig()).toEqual({ origin: "*", credentials: true });
  });
});

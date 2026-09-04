import ms from "ms";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";

// Target import
import { getMillisecondConfig } from "./millisecond";

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

const getEnvConfigMock = vi.mocked(getEnvConfig);

describe("Config: getMillisecondConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should parse every provided env duration", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        STORAGE_PROVIDER_PUBLIC_READ_URL_EXPIRATION: "2d",
        STORAGE_PROVIDER_PUBLIC_WRITE_URL_EXPIRATION: "10m",
        PROCESSING_DEFAULT_KEEP_UNTIL: "45",
        PROCESSING_ALLOWED_KEEP_UNTIL_EXTEND: "60",
      }),
    );

    expect(getMillisecondConfig()).toEqual({
      STORAGE_PROVIDER_PUBLIC_READ_URL_EXPIRATION: ms("2d"),
      STORAGE_PROVIDER_PUBLIC_WRITE_URL_EXPIRATION: ms("10m"),
      PROCESSING_DEFAULT_KEEP_UNTIL: ms("45"),
      PROCESSING_ALLOWED_KEEP_UNTIL_EXTEND: ms("60"),
    });
  });

  it("should apply built-in defaults when env durations are unset", () => {
    getEnvConfigMock.mockReturnValue(getEnvConfigMockValue({}));

    expect(getMillisecondConfig()).toEqual({
      STORAGE_PROVIDER_PUBLIC_READ_URL_EXPIRATION: ms("1d"),
      STORAGE_PROVIDER_PUBLIC_WRITE_URL_EXPIRATION: ms("5m"),
      PROCESSING_DEFAULT_KEEP_UNTIL: ms("30"),
      PROCESSING_ALLOWED_KEEP_UNTIL_EXTEND: ms("30"),
    });
  });
});

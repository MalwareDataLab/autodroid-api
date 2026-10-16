import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getMillisecondConfig } from "./millisecond";

// Target import
import { getProcessingConfig } from "./processing";

vi.mock("./millisecond", () => ({ getMillisecondConfig: vi.fn() }));

const getMillisecondConfigMock = vi.mocked(getMillisecondConfig);

describe("Config: getProcessingConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should map millisecond durations and expose the worker acquisition constant", () => {
    getMillisecondConfigMock.mockReturnValue({
      STORAGE_PROVIDER_PUBLIC_READ_URL_EXPIRATION: 3000,
      STORAGE_PROVIDER_PUBLIC_WRITE_URL_EXPIRATION: 4000,
      PROCESSING_DEFAULT_KEEP_UNTIL: 1000,
      PROCESSING_ALLOWED_KEEP_UNTIL_EXTEND: 2000,
    });

    expect(getProcessingConfig()).toEqual({
      PROCESSING_DEFAULT_KEEP_UNTIL_MS: 1000,
      PROCESSING_ALLOWED_KEEP_UNTIL_EXTEND_MS: 2000,
      ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS: 60,
    });
  });
});

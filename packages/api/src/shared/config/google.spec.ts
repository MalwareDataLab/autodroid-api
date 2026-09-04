import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";

// Target import
import { getGoogleStorageProviderConfig } from "./google";

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

const getEnvConfigMock = vi.mocked(getEnvConfig);

describe("Config: getGoogleStorageProviderConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should map env vars and unescape newlines in the private key", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        GOOGLE_STORAGE_PROVIDER_PROJECT_ID: "project",
        GOOGLE_STORAGE_PROVIDER_CLIENT_EMAIL: "client@google.com",
        GOOGLE_STORAGE_PROVIDER_BUCKET_NAME: "bucket",
        GOOGLE_STORAGE_PROVIDER_PRIVATE_KEY: "line1\\nline2\\nline3",
      }),
    );

    expect(getGoogleStorageProviderConfig()).toEqual({
      project_id: "project",
      client_email: "client@google.com",
      bucket_name: "bucket",
      private_key: "line1\nline2\nline3",
    });
  });

  it("should stringify missing env vars", () => {
    getEnvConfigMock.mockReturnValue(getEnvConfigMockValue({}));

    expect(getGoogleStorageProviderConfig()).toEqual({
      project_id: "undefined",
      client_email: "undefined",
      bucket_name: "undefined",
      private_key: "undefined",
    });
  });
});

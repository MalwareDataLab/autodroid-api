import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";

// Target import
import { getFirebaseAuthProviderConfig } from "./firebase";

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

const getEnvConfigMock = vi.mocked(getEnvConfig);

describe("Config: getFirebaseAuthProviderConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should map env vars and unescape newlines in the private key", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        FIREBASE_AUTHENTICATION_PROVIDER_PROJECT_ID: "project",
        FIREBASE_AUTHENTICATION_PROVIDER_CLIENT_EMAIL: "client@firebase.com",
        FIREBASE_AUTHENTICATION_PROVIDER_PRIVATE_KEY: "line1\\nline2\\nline3",
      }),
    );

    expect(getFirebaseAuthProviderConfig()).toEqual({
      project_id: "project",
      client_email: "client@firebase.com",
      private_key: "line1\nline2\nline3",
    });
  });

  it("should stringify missing env vars", () => {
    getEnvConfigMock.mockReturnValue(getEnvConfigMockValue({}));

    expect(getFirebaseAuthProviderConfig()).toEqual({
      project_id: "undefined",
      client_email: "undefined",
      private_key: "undefined",
    });
  });
});

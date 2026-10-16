import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";

// Target import
import { getMcpConfig } from "./mcp";

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

const getEnvConfigMock = vi.mocked(getEnvConfig);

describe("Config: getMcpConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should derive every endpoint from APP_URL's origin and FRONTEND_URL", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        APP_URL: "https://api.autodroid.example/some/base/path",
        FRONTEND_URL: "https://app.autodroid.example",
        MCP_OAUTH_CLIENT_ID_SECRET: "the-secret",
      }),
    );

    expect(getMcpConfig()).toEqual({
      issuer: "https://api.autodroid.example",
      resource: "https://api.autodroid.example/mcp",
      resourceName: "AutoDroid",
      protectedResourceMetadataUrl:
        "https://api.autodroid.example/.well-known/oauth-protected-resource/mcp",
      authorizationEndpoint: "https://api.autodroid.example/oauth/authorize",
      tokenEndpoint: "https://api.autodroid.example/oauth/token",
      registrationEndpoint: "https://api.autodroid.example/oauth/register",
      revocationEndpoint: "https://api.autodroid.example/oauth/revoke",
      consentUrl: "https://app.autodroid.example/mcp/authorize",
      clientIdSecret: "the-secret",
    });
  });

  it("should throw when APP_URL is missing", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        FRONTEND_URL: "https://app.autodroid.example",
        MCP_OAUTH_CLIENT_ID_SECRET: "the-secret",
      }),
    );

    expect(() => getMcpConfig()).toThrowError(
      "APP_URL environment variable is required.",
    );
  });

  it("should throw when FRONTEND_URL is missing", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        APP_URL: "https://api.autodroid.example",
        MCP_OAUTH_CLIENT_ID_SECRET: "the-secret",
      }),
    );

    expect(() => getMcpConfig()).toThrowError(
      "FRONTEND_URL environment variable is required.",
    );
  });

  it("should throw when MCP_OAUTH_CLIENT_ID_SECRET is missing", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        APP_URL: "https://api.autodroid.example",
        FRONTEND_URL: "https://app.autodroid.example",
      }),
    );

    expect(() => getMcpConfig()).toThrowError(
      "MCP_OAUTH_CLIENT_ID_SECRET environment variable is required.",
    );
  });
});

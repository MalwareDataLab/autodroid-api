import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";

// Target import
import { getCorsConfig, getCorsOptionsDelegate } from "./cors";

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
      exposedHeaders: ["WWW-Authenticate"],
    });
  });

  it("should allow all origins outside production", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        NODE_ENV: "development",
        CORS_ALLOWED_FROM: "https://a.com",
      }),
    );

    expect(getCorsConfig()).toEqual({
      origin: "*",
      credentials: true,
      exposedHeaders: ["WWW-Authenticate"],
    });
  });
});

describe("Config: getCorsOptionsDelegate", () => {
  const optionsFor = (url: string) => {
    let resolved: unknown;
    getCorsOptionsDelegate()({ url } as never, (_error, options) => {
      resolved = options;
    });
    return resolved;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        NODE_ENV: "production",
        CORS_ALLOWED_FROM: "https://a.com",
      }),
    );
  });

  it.each([
    "/oauth/token",
    "/oauth/register",
    "/oauth/authorize?client_id=x",
    "/.well-known/oauth-authorization-server",
    "/.well-known/oauth-protected-resource/mcp",
  ])(
    "should let any origin reach the public OAuth endpoint %s, without credentials",
    url => {
      expect(optionsFor(url)).toEqual({ origin: "*" });
    },
  );

  it("should keep a request with no url on the configured origin allowlist", () => {
    let resolved: unknown;
    getCorsOptionsDelegate()({} as never, (_error, options) => {
      resolved = options;
    });

    expect(resolved).toEqual({
      origin: ["https://a.com"],
      credentials: true,
      exposedHeaders: ["WWW-Authenticate"],
    });
  });

  it.each(["/graphql", "/mcp", "/oauthish", "/api/oauth/token"])(
    "should keep %s on the configured origin allowlist",
    url => {
      expect(optionsFor(url)).toEqual({
        origin: ["https://a.com"],
        credentials: true,
        exposedHeaders: ["WWW-Authenticate"],
      });
    },
  );
});

import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Target import
import { signMcpAuthorizationClientIdPayload } from "./signMcpAuthorizationClientIdPayload.util";

vi.mock("@config/mcp", () => ({ getMcpConfig: vi.fn() }));

const getMcpConfigMock = vi.mocked(getMcpConfig);

const useSecret = (clientIdSecret: string) =>
  getMcpConfigMock.mockReturnValue({ clientIdSecret } as ReturnType<
    typeof getMcpConfig
  >);

describe("Util: signMcpAuthorizationClientIdPayload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should sign the payload with HMAC SHA-256 keyed by the client id secret, in base64url", () => {
    useSecret("spec-secret");

    expect(signMcpAuthorizationClientIdPayload("payload")).toBe(
      "LOSbhIuBCkEjQK8B20OX81YkXJc4BlrFMBS0GhLTnw8",
    );
  });

  it("should sign the same payload differently under another secret", () => {
    useSecret("other-secret");

    expect(signMcpAuthorizationClientIdPayload("payload")).toBe(
      "Lo3y0yooARb9zHolWnsro0frjfWp1K-R_Prash286Es",
    );
  });
});

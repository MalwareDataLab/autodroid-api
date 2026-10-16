import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Target import
import { McpAuthorizationClientRegisterService } from "./mcpAuthorizationClientRegister.service";

vi.mock("@config/mcp", () => ({ getMcpConfig: vi.fn() }));

const getMcpConfigMock = vi.mocked(getMcpConfig);
const CLIENT_ID_SECRET = "test-client-id-secret";

const expectedSignature = (encodedPayload: string) =>
  createHmac("sha256", CLIENT_ID_SECRET)
    .update(encodedPayload)
    .digest("base64url");

describe("Service: McpAuthorizationClientRegisterService", () => {
  let service: McpAuthorizationClientRegisterService;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    getMcpConfigMock.mockReturnValue({
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
      clientIdSecret: CLIENT_ID_SECRET,
    });

    service = new McpAuthorizationClientRegisterService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should sign a client_id encoding only the redirect_uris and client_name, and report the time it was issued", () => {
    const result = service.execute({
      redirect_uris: ["https://client.example.com/callback"],
      client_name: "Example MCP Client",
    });

    const issuedAt = Math.floor(
      new Date("2026-01-01T00:00:00.000Z").getTime() / 1000,
    );
    const payload = {
      redirect_uris: ["https://client.example.com/callback"],
      client_name: "Example MCP Client",
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url",
    );
    const expectedClientId = `mcpc1.${encodedPayload}.${expectedSignature(encodedPayload)}`;

    expect(result).toEqual({
      client_id: expectedClientId,
      client_id_issued_at: issuedAt,
      redirect_uris: ["https://client.example.com/callback"],
      client_name: "Example MCP Client",
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    });
  });

  it("should give the same client_id to a client registering the same metadata again later", () => {
    const metadata = {
      redirect_uris: ["https://client.example.com/callback"],
      client_name: "Example MCP Client",
    };
    const first = service.execute(metadata);
    vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));

    const second = service.execute(metadata);

    expect(second.client_id).toBe(first.client_id);
    expect(second.client_id_issued_at).toBe(
      first.client_id_issued_at! + 59 * 24 * 60 * 60,
    );
  });

  it("should give another client_id when the metadata differs", () => {
    const first = service.execute({
      redirect_uris: ["https://client.example.com/callback"],
      client_name: "Example MCP Client",
    });

    const renamed = service.execute({
      redirect_uris: ["https://client.example.com/callback"],
      client_name: "Another MCP Client",
    });
    const redirected = service.execute({
      redirect_uris: ["https://client.example.com/other-callback"],
      client_name: "Example MCP Client",
    });

    expect(
      new Set([first.client_id, renamed.client_id, redirected.client_id]).size,
    ).toBe(3);
  });

  it("should sign loopback redirect_uris without their port, since any port matches them, while echoing them as registered", () => {
    const redirect_uris = [
      "http://127.0.0.1:33418/callback",
      "http://localhost:4000/callback?x=1",
      "http://[::1]:5000/callback",
      "https://client.example.com:8443/callback",
    ];

    const result = service.execute({ redirect_uris });

    const encodedPayload = Buffer.from(
      JSON.stringify({
        redirect_uris: [
          "http://127.0.0.1/callback",
          "http://localhost/callback?x=1",
          "http://[::1]/callback",
          "https://client.example.com:8443/callback",
        ],
      }),
    ).toString("base64url");
    expect(result.client_id).toBe(
      `mcpc1.${encodedPayload}.${expectedSignature(encodedPayload)}`,
    );
    expect(result.redirect_uris).toEqual(redirect_uris);
    expect(
      service.execute({
        redirect_uris: [
          "http://127.0.0.1:50001/callback",
          "http://localhost/callback?x=1",
          "http://[::1]:6000/callback",
          "https://client.example.com:8443/callback",
        ],
      }).client_id,
    ).toBe(result.client_id);
  });

  it("should omit client_name from the result when none was given", () => {
    const result = service.execute({
      redirect_uris: ["https://client.example.com/callback"],
    });

    expect(result).not.toHaveProperty("client_name");
  });

  it("should reject an empty redirect_uris list", () => {
    expect(() => service.execute({ redirect_uris: [] })).toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_client_register_service/INVALID_CLIENT_METADATA",
        statusCode: 400,
        message: "At least one redirect_uri is required.",
      }),
    );
  });

  it("should reject more than the maximum number of redirect_uris", () => {
    const redirect_uris = Array.from(
      { length: 6 },
      (_, index) => `https://client.example.com/callback-${index}`,
    );

    expect(() => service.execute({ redirect_uris })).toThrowError(
      "A client may register at most 5 redirect_uris.",
    );
  });

  it("should reject a redirect_uri longer than the maximum length", () => {
    const redirect_uris = [`https://client.example.com/${"a".repeat(500)}`];

    expect(() => service.execute({ redirect_uris })).toThrowError(
      "redirect_uri must be at most 512 characters.",
    );
  });

  it.each([
    ["https://client.example.com/callback", true],
    ["http://127.0.0.1:3118/callback", true],
    ["http://[::1]:3118/callback", true],
    ["http://attacker.example.com/callback", false],
    ["ftp://client.example.com/callback", false],
  ])(
    "should validate redirect_uri %s as allowed=%s",
    (redirectUri, allowed) => {
      const run = () => service.execute({ redirect_uris: [redirectUri] });

      if (allowed) {
        expect(run()).toHaveProperty("client_id");
      } else {
        expect(run).toThrowError(
          `redirect_uri "${redirectUri}" must use https, or http on a loopback address.`,
        );
      }
    },
  );

  it("should reject a client_name longer than the maximum length", () => {
    expect(() =>
      service.execute({
        redirect_uris: ["https://client.example.com/callback"],
        client_name: "a".repeat(101),
      }),
    ).toThrowError("client_name must be at most 100 characters.");
  });
});

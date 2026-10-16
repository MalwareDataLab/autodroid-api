import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Service import
import { McpAuthorizationClientMetadataFetchService } from "./mcpAuthorizationClientMetadataFetch.service";

// Target import
import { McpAuthorizationClientResolveService } from "./mcpAuthorizationClientResolve.service";

vi.mock("@config/mcp", () => ({ getMcpConfig: vi.fn() }));

const cimdExecuteMock = vi.fn();
vi.mock("./mcpAuthorizationClientMetadataFetch.service", () => ({
  McpAuthorizationClientMetadataFetchService: vi.fn(() => ({
    execute: cimdExecuteMock,
  })),
}));

const getMcpConfigMock = vi.mocked(getMcpConfig);
const CLIENT_ID_SECRET = "test-client-id-secret";

const signDcrClientId = (payload: Record<string, unknown>) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = createHmac("sha256", CLIENT_ID_SECRET)
    .update(encodedPayload)
    .digest("base64url");
  return `mcpc1.${encodedPayload}.${signature}`;
};

describe("Service: McpAuthorizationClientResolveService", () => {
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;
  let service: McpAuthorizationClientResolveService;

  beforeEach(() => {
    vi.clearAllMocks();

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

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: {},
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    service = new McpAuthorizationClientResolveService(
      inMemoryDatabaseProviderMock,
    );
  });

  describe("DCR client_ids", () => {
    it("should resolve a validly signed DCR client_id", async () => {
      const payload = {
        redirect_uris: ["https://client.example.com/callback"],
        client_name: "Example MCP Client",
      };
      const client_id = signDcrClientId(payload);

      const result = await service.execute({ client_id });

      expect(result).toEqual({
        client_id,
        redirect_uris: ["https://client.example.com/callback"],
        client_name: "Example MCP Client",
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      });
      expect(McpAuthorizationClientMetadataFetchService).not.toHaveBeenCalled();
    });

    it("should omit client_name when the signed payload has none", async () => {
      const client_id = signDcrClientId({
        redirect_uris: ["https://client.example.com/callback"],
      });

      const result = await service.execute({ client_id });

      expect(result).not.toHaveProperty("client_name");
    });

    it("should reject a client_id with a tampered signature", async () => {
      const client_id = signDcrClientId({
        redirect_uris: ["https://client.example.com/callback"],
      });
      const tampered = `${client_id}tampered`;

      expect(await service.execute({ client_id: tampered })).toBeUndefined();
    });

    it("should reject a client_id whose signature has the right length but another value", async () => {
      const client_id = signDcrClientId({
        redirect_uris: ["https://client.example.com/callback"],
      });
      const signatureStart = client_id.lastIndexOf(".") + 1;
      const forged = `${client_id.slice(0, signatureStart)}${
        client_id[signatureStart] === "A" ? "B" : "A"
      }${client_id.slice(signatureStart + 1)}`;

      expect(forged).toHaveLength(client_id.length);
      expect(await service.execute({ client_id: forged })).toBeUndefined();
    });

    it("should reject a client_id with no separator between the payload and the signature", async () => {
      expect(
        await service.execute({ client_id: "mcpc1.no-separator-here" }),
      ).toBeUndefined();
    });

    it("should reject a client_id whose payload is not valid base64url JSON", async () => {
      const encodedPayload = "not-valid-json";
      const signature = createHmac("sha256", CLIENT_ID_SECRET)
        .update(encodedPayload)
        .digest("base64url");

      expect(
        await service.execute({
          client_id: `mcpc1.${encodedPayload}.${signature}`,
        }),
      ).toBeUndefined();
    });

    it("should reject a client_id whose payload does not have the expected shape", async () => {
      const client_id = signDcrClientId({ not: "a valid payload" });

      expect(await service.execute({ client_id })).toBeUndefined();
    });
  });

  describe("CIMD client_ids", () => {
    const client_id = "https://client.example.com/.well-known/mcp-client.json";

    it("should delegate to the metadata fetch service and return its result", async () => {
      cimdExecuteMock.mockResolvedValue({
        client_id,
        redirect_uris: ["https://client.example.com/callback"],
        token_endpoint_auth_method: "none",
      });

      const result = await service.execute({ client_id });

      expect(cimdExecuteMock).toHaveBeenCalledWith({ client_id });
      expect(result).toEqual({
        client_id,
        redirect_uris: ["https://client.example.com/callback"],
        token_endpoint_auth_method: "none",
      });
    });

    it("should return undefined when the metadata fetch fails", async () => {
      cimdExecuteMock.mockRejectedValue(new Error("fetch failed"));

      expect(await service.execute({ client_id })).toBeUndefined();
    });

    it("should not route a plain http client_id to the metadata fetch service", async () => {
      const httpClientId = "http://127.0.0.1:3118/client.json";

      expect(
        await service.execute({ client_id: httpClientId }),
      ).toBeUndefined();
      expect(McpAuthorizationClientMetadataFetchService).not.toHaveBeenCalled();
    });
  });

  describe("neither a DCR nor a CIMD client_id", () => {
    it("should return undefined for an unrecognized client_id shape", async () => {
      expect(
        await service.execute({ client_id: "some-opaque-client-id" }),
      ).toBeUndefined();
      expect(McpAuthorizationClientMetadataFetchService).not.toHaveBeenCalled();
    });
  });
});

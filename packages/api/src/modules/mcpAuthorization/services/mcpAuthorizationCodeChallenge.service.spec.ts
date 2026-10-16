import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Target import
import { McpAuthorizationCodeChallengeService } from "./mcpAuthorizationCodeChallenge.service";

const AUTHORIZATION_CODE = "the-authorization-code";
const CODE_HASH = createHash("sha256")
  .update(AUTHORIZATION_CODE)
  .digest("base64url");

const CLIENT = { client_id: "mcpc1.abc.def" } as any;

describe("Service: McpAuthorizationCodeChallengeService", () => {
  let getMock: ReturnType<typeof vi.fn>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;
  let service: McpAuthorizationCodeChallengeService;

  beforeEach(() => {
    getMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        client_id: "mcpc1.abc.def",
        code_challenge: "the-challenge",
        redirect_uri: "https://client.example.com/callback",
        user_auth_provider_conn_id: "conn-1",
      }),
    );

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { get: getMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    service = new McpAuthorizationCodeChallengeService(
      inMemoryDatabaseProviderMock,
    );
  });

  it("should return the stored code_challenge without consuming the code", async () => {
    const result = await service.execute({
      client: CLIENT,
      authorizationCode: AUTHORIZATION_CODE,
    });

    expect(getMock).toHaveBeenCalledWith(`mcp-oauth:code:${CODE_HASH}`);
    expect(result).toBe("the-challenge");
  });

  it("should throw when the code does not exist", async () => {
    getMock.mockResolvedValueOnce(null);

    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_challenge_service/CODE_NOT_FOUND",
        statusCode: 400,
      }),
    );
  });

  it("should throw when the code was issued to a different client", async () => {
    await expect(
      service.execute({
        client: { client_id: "mcpc1.other.client" } as any,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_challenge_service/CODE_CLIENT_MISMATCH",
        statusCode: 400,
      }),
    );
  });
});

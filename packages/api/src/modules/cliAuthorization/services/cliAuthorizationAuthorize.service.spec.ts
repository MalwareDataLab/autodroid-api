import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Provider import
import { IAuthenticationProvider } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Entity import
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";

// Target import
import { CliAuthorizationAuthorizeService } from "./cliAuthorizationAuthorize.service";

describe("Service: CliAuthorizationAuthorizeService", () => {
  const userCode = "ABCDEFGH";
  const challenge = "a".repeat(43);
  const language = "en-US";
  const conn = {
    auth_provider: AUTH_PROVIDER.FIREBASE,
    code: "user-code-123",
  } as unknown as UserAuthProviderConn;

  let createUserTokenByCodeMock: ReturnType<typeof vi.fn>;
  let getProviderMock: ReturnType<typeof vi.fn>;
  let getMock: ReturnType<typeof vi.fn>;
  let delMock: ReturnType<typeof vi.fn>;
  let setMock: ReturnType<typeof vi.fn>;

  let authenticationProviderMock: Mocked<IAuthenticationProvider>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;

  let cliAuthorizationAuthorizeService: CliAuthorizationAuthorizeService;

  beforeEach(() => {
    createUserTokenByCodeMock = vi.fn().mockResolvedValue("minted-token");
    getProviderMock = vi.fn().mockResolvedValue({
      createUserTokenByCode: createUserTokenByCodeMock,
    });
    getMock = vi.fn().mockResolvedValue(challenge);
    delMock = vi.fn().mockResolvedValue(1);
    setMock = vi.fn().mockResolvedValue("OK");

    authenticationProviderMock = {
      initialization: Promise.resolve(),
      getProvider: getProviderMock,
    } as unknown as Mocked<IAuthenticationProvider>;

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { get: getMock, del: delMock, set: setMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    cliAuthorizationAuthorizeService = new CliAuthorizationAuthorizeService(
      authenticationProviderMock,
      inMemoryDatabaseProviderMock,
    );
  });

  it("should resolve the challenge from the user code, mint a token, consume the code and store the token under the challenge key", async () => {
    await cliAuthorizationAuthorizeService.execute({
      user_code: userCode,
      user_auth_provider_conn: conn,
      language,
    });

    expect(getMock).toHaveBeenCalledWith(`cli-authorization-code:${userCode}`);
    expect(getProviderMock).toHaveBeenCalledWith(
      AUTH_PROVIDER.FIREBASE,
      language,
    );
    expect(createUserTokenByCodeMock).toHaveBeenCalledWith({
      code: "user-code-123",
      language,
    });
    expect(delMock).toHaveBeenCalledWith(`cli-authorization-code:${userCode}`);
    expect(setMock).toHaveBeenCalledWith(
      `cli-authorization:${challenge}`,
      "minted-token",
      "EX",
      300,
      "NX",
    );
  });

  it("should throw a 404 when the user code was never registered, already used, or expired", async () => {
    getMock.mockResolvedValueOnce(null);

    await expect(() =>
      cliAuthorizationAuthorizeService.execute({
        user_code: userCode,
        user_auth_provider_conn: conn,
        language,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@cli_authorization_authorize_service/CODE_NOT_FOUND",
        statusCode: 404,
      }),
    );
    expect(getProviderMock).not.toHaveBeenCalled();
    expect(setMock).not.toHaveBeenCalled();
  });

  it("should throw a 409 when the challenge was already authorized", async () => {
    setMock.mockResolvedValueOnce(null);

    await expect(() =>
      cliAuthorizationAuthorizeService.execute({
        user_code: userCode,
        user_auth_provider_conn: conn,
        language,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@cli_authorization_authorize_service/CHALLENGE_ALREADY_AUTHORIZED",
        statusCode: 409,
      }),
    );
  });

  it("should propagate a provider error, leave the code intact for a retry, and store nothing", async () => {
    createUserTokenByCodeMock.mockRejectedValueOnce(new Error("provider down"));

    await expect(() =>
      cliAuthorizationAuthorizeService.execute({
        user_code: userCode,
        user_auth_provider_conn: conn,
        language,
      }),
    ).rejects.toThrowError("provider down");

    expect(delMock).not.toHaveBeenCalled();
    expect(setMock).not.toHaveBeenCalled();
  });
});

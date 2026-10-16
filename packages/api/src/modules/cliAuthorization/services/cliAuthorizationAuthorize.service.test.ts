import { createHash } from "node:crypto";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Provider import
import { IAuthenticationProvider } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Entity import
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";

// Service import
import { CliAuthorizationRegisterService } from "./cliAuthorizationRegister.service";
import { CliAuthorizationTokenRedeemService } from "./cliAuthorizationTokenRedeem.service";

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

  let authenticationProvider: IAuthenticationProvider;
  let inMemoryDatabaseProvider: IInMemoryDatabaseProvider;

  let cliAuthorizationRegisterService: CliAuthorizationRegisterService;
  let cliAuthorizationAuthorizeService: CliAuthorizationAuthorizeService;

  beforeEach(async () => {
    authenticationProvider = container.resolve("AuthenticationProvider");
    inMemoryDatabaseProvider = container.resolve("InMemoryDatabaseProvider");

    const authenticationMethod = await authenticationProvider.getProvider(
      AUTH_PROVIDER.FIREBASE,
    );
    vi.mocked(authenticationMethod.createUserTokenByCode).mockResolvedValue(
      "minted-token",
    );

    cliAuthorizationRegisterService = new CliAuthorizationRegisterService(
      inMemoryDatabaseProvider,
    );
    cliAuthorizationAuthorizeService = new CliAuthorizationAuthorizeService(
      authenticationProvider,
      inMemoryDatabaseProvider,
    );
  });

  it("should store the minted token in real Redis so the token redeem service can consume it exactly once", async () => {
    const verifier = "c".repeat(43);
    const derivedChallenge = createHash("sha256")
      .update(verifier)
      .digest("base64url");

    await cliAuthorizationRegisterService.execute({
      code_challenge: derivedChallenge,
      user_code: userCode,
    });
    await cliAuthorizationAuthorizeService.execute({
      user_code: userCode,
      user_auth_provider_conn: conn,
      language,
    });

    const storedTtl = await inMemoryDatabaseProvider.connection.ttl(
      `cli-authorization:${derivedChallenge}`,
    );
    expect(storedTtl).toBeGreaterThan(0);
    expect(storedTtl).toBeLessThanOrEqual(300);

    const cliAuthorizationTokenRedeemService =
      new CliAuthorizationTokenRedeemService(inMemoryDatabaseProvider);

    const redeemedToken = await cliAuthorizationTokenRedeemService.execute({
      code_verifier: verifier,
    });
    expect(redeemedToken).toBe("minted-token");

    await expect(
      cliAuthorizationTokenRedeemService.execute({ code_verifier: verifier }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@cli_authorization_token_redeem_service/CHALLENGE_NOT_AUTHORIZED",
      }),
    );
  });

  it("should throw a 404 against real Redis when the user code was never registered", async () => {
    await expect(
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
  });

  it("should throw a 404 when the same user code is authorized twice (single-use)", async () => {
    await cliAuthorizationRegisterService.execute({
      code_challenge: challenge,
      user_code: userCode,
    });

    await cliAuthorizationAuthorizeService.execute({
      user_code: userCode,
      user_auth_provider_conn: conn,
      language,
    });

    await expect(
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
  });

  it("should throw a 409 against real Redis when the challenge was already authorized, leaving the stored token untouched", async () => {
    await inMemoryDatabaseProvider.connection.set(
      `cli-authorization:${challenge}`,
      "already-stored-token",
      "EX",
      300,
      "NX",
    );
    await cliAuthorizationRegisterService.execute({
      code_challenge: challenge,
      user_code: userCode,
    });

    await expect(
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

    const storedToken = await inMemoryDatabaseProvider.connection.get(
      `cli-authorization:${challenge}`,
    );
    expect(storedToken).toBe("already-stored-token");
  });

  it("should propagate a provider error and store nothing in real Redis", async () => {
    const authenticationMethod = await authenticationProvider.getProvider(
      AUTH_PROVIDER.FIREBASE,
    );
    vi.mocked(authenticationMethod.createUserTokenByCode).mockRejectedValueOnce(
      new Error("provider down"),
    );
    await cliAuthorizationRegisterService.execute({
      code_challenge: challenge,
      user_code: userCode,
    });

    await expect(
      cliAuthorizationAuthorizeService.execute({
        user_code: userCode,
        user_auth_provider_conn: conn,
        language,
      }),
    ).rejects.toThrowError("provider down");

    const storedToken = await inMemoryDatabaseProvider.connection.get(
      `cli-authorization:${challenge}`,
    );
    expect(storedToken).toBeNull();
  });

  it("should let the user retry the same code against real Redis after a transient provider failure", async () => {
    const authenticationMethod = await authenticationProvider.getProvider(
      AUTH_PROVIDER.FIREBASE,
    );
    vi.mocked(authenticationMethod.createUserTokenByCode)
      .mockRejectedValueOnce(new Error("provider down"))
      .mockResolvedValueOnce("minted-token");
    await cliAuthorizationRegisterService.execute({
      code_challenge: challenge,
      user_code: userCode,
    });

    await expect(
      cliAuthorizationAuthorizeService.execute({
        user_code: userCode,
        user_auth_provider_conn: conn,
        language,
      }),
    ).rejects.toThrowError("provider down");

    await cliAuthorizationAuthorizeService.execute({
      user_code: userCode,
      user_auth_provider_conn: conn,
      language,
    });

    const storedToken = await inMemoryDatabaseProvider.connection.get(
      `cli-authorization:${challenge}`,
    );
    expect(storedToken).toBe("minted-token");
  });
});

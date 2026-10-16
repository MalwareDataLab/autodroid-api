import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Provider import
import { IAuthenticationProvider } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { hashBase64Url } from "@shared/utils/hashBase64Url";

// Constant import
import { MCP_AUTHORIZATION_CODE_KEY_PREFIX } from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Repository import
import { IMcpAuthorizationGrantRepository } from "@modules/mcpAuthorization/repositories/IMcpAuthorizationGrant.repository";
import { IUserAuthProviderConnRepository } from "../repositories/IUserAuthProviderConn.repository";

// Factory import
import { mcpAuthorizationGrantFactory } from "@modules/mcpAuthorization/entities/factories/mcpAuthorizationGrant.factory";
import { userFactory } from "../entities/factories/user.factory";

// Service import
import { McpAuthorizationCodeExchangeService } from "@modules/mcpAuthorization/services/mcpAuthorizationCodeExchange.service";

// Target import
import { UserSessionsCloseService } from "./userSessionsClose.service";

describe("Service: UserSessionsCloseService", () => {
  let authenticationProvider: IAuthenticationProvider;
  let userAuthProviderConnRepository: IUserAuthProviderConnRepository;
  let mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository;

  let userSessionsCloseService: UserSessionsCloseService;

  beforeEach(() => {
    authenticationProvider = container.resolve("AuthenticationProvider");
    userAuthProviderConnRepository = container.resolve(
      "UserAuthProviderConnRepository",
    );
    mcpAuthorizationGrantRepository = container.resolve(
      "McpAuthorizationGrantRepository",
    );
    userSessionsCloseService = container.resolve(UserSessionsCloseService);
  });

  it("should close user sessions", async () => {
    const user = await userFactory.create();
    await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: "code",
    });

    const authenticationMethod = await authenticationProvider.getProvider(
      AUTH_PROVIDER.FIREBASE,
    );
    const revokeTokensSpy = vi.spyOn(authenticationMethod, "revokeTokens");

    await userSessionsCloseService.execute({ user, language: "en" });

    expect(revokeTokensSpy).toHaveBeenCalledOnce();
  });

  it("should revoke every active MCP connection of the user, and none of another user's", async () => {
    const user = await userFactory.create();
    const otherUser = await userFactory.create();
    await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: "code",
    });
    const earlierRevocation = new Date(Date.now() - 60 * 60 * 1000);
    const mine = await Promise.all([
      mcpAuthorizationGrantFactory.create({ user_id: user.id }),
      mcpAuthorizationGrantFactory.create({ user_id: user.id }),
    ]);
    const alreadyRevoked = await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
      revoked_at: earlierRevocation,
    });
    const theirs = await mcpAuthorizationGrantFactory.create({
      user_id: otherUser.id,
    });

    await userSessionsCloseService.execute({ user, language: "en" });

    await expect(
      mcpAuthorizationGrantRepository.findMany({
        user_id: user.id,
        active: true,
      }),
    ).resolves.toEqual([]);
    await Promise.all(
      mine.map(async grant =>
        expect(
          (await mcpAuthorizationGrantRepository.findOne({ id: grant.id }))
            ?.revoked_at,
        ).toBeInstanceOf(Date),
      ),
    );
    await expect(
      mcpAuthorizationGrantRepository.findOne({ id: alreadyRevoked.id }),
    ).resolves.toEqual(
      expect.objectContaining({ revoked_at: earlierRevocation }),
    );
    await expect(
      mcpAuthorizationGrantRepository.findOne({ id: theirs.id, active: true }),
    ).resolves.toEqual(expect.objectContaining({ id: theirs.id }));
  });

  it("should stop an authorization code approved before the sessions were closed from becoming a grant", async () => {
    const user = await userFactory.create();
    const userAuthProviderConn = await userAuthProviderConnRepository.createOne(
      {
        user_id: user.id,
        auth_provider: AUTH_PROVIDER.FIREBASE,
        payload: {},
        code: "code",
      },
    );
    const { connection } = container.resolve<IInMemoryDatabaseProvider>(
      "InMemoryDatabaseProvider",
    );
    await connection.set(
      `${MCP_AUTHORIZATION_CODE_KEY_PREFIX}${hashBase64Url("held-code")}`,
      JSON.stringify({
        client_id: "mcpc1.abc.def",
        redirect_uri: "https://client.example.com/callback",
        code_challenge: "challenge",
        resource: getMcpConfig().resource,
        user_auth_provider_conn_id: userAuthProviderConn.id,
        user_id: user.id,
        sessions_epoch: 0,
      }),
      "EX",
      60,
    );

    await userSessionsCloseService.execute({ user, language: "en" });

    await expect(
      container.resolve(McpAuthorizationCodeExchangeService).execute({
        client: {
          client_id: "mcpc1.abc.def",
          redirect_uris: ["https://client.example.com/callback"],
        },
        authorizationCode: "held-code",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_exchange_service/CODE_REVOKED",
      }),
    );
    await expect(
      mcpAuthorizationGrantRepository.findMany({
        user_id: user.id,
        active: true,
      }),
    ).resolves.toEqual([]);
  });

  it("should throw an error if no user auth provider conn is found", async () => {
    const user = await userFactory.create();

    await expect(
      userSessionsCloseService.execute({ user, language: "en" }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_session_close/NO_AUTH_PROVIDER_ACCOUNT_FOUND",
      }),
    );
  });
});

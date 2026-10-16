import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Provider import
import {
  IAuthenticationMethod,
  IAuthenticationProvider,
} from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Constant import
import { MCP_AUTHORIZATION_SESSIONS_EPOCH_KEY_PREFIX } from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Entity import
import { User } from "../entities/user.entity";
import { UserAuthProviderConn } from "../entities/userAuthProviderConn.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "@modules/mcpAuthorization/repositories/IMcpAuthorizationGrant.repository";
import { IUserAuthProviderConnRepository } from "../repositories/IUserAuthProviderConn.repository";

// Target import
import { UserSessionsCloseService } from "./userSessionsClose.service";

describe("Service: UserSessionsCloseService", () => {
  let authenticationProviderMock: Mocked<IAuthenticationProvider>;
  let userAuthProviderConnRepositoryMock: Mocked<IUserAuthProviderConnRepository>;
  let incrSessionsEpochMock: ReturnType<typeof vi.fn>;
  let revokeGrantsMock: ReturnType<typeof vi.fn>;

  let authenticationMethod: Mocked<IAuthenticationMethod>;

  let userSessionsCloseService: UserSessionsCloseService;

  beforeEach(() => {
    authenticationMethod = {
      auth_provider: AUTH_PROVIDER.FIREBASE,
      initialization: Promise.resolve(),

      verifyAccessToken: vi.fn(),
      createUserTokenByCode: vi.fn(),
      revokeTokens: vi.fn(),
      createUser: vi.fn(),
      getUserByAuthProviderSession: vi.fn(),
      getUserByCode: vi.fn(),
      getUserByEmail: vi.fn(),
      getUserByPhoneNumber: vi.fn(),
      updateUserByCode: vi.fn(),
      deleteUserByCode: vi.fn(),
      dispose: vi.fn(),
    };

    authenticationProviderMock = {
      initialization: Promise.resolve(),
      getProvider: vi.fn((_: AUTH_PROVIDER) =>
        Promise.resolve(authenticationMethod as IAuthenticationMethod),
      ),
      default_auth_provider: AUTH_PROVIDER.FIREBASE,
      dispose: vi.fn(),
    };

    userAuthProviderConnRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    incrSessionsEpochMock = vi.fn().mockResolvedValue(1);
    revokeGrantsMock = vi.fn().mockResolvedValue(0);

    userSessionsCloseService = new UserSessionsCloseService(
      authenticationProviderMock,
      userAuthProviderConnRepositoryMock,
      {
        connection: {
          incr: incrSessionsEpochMock,
          expire: vi.fn().mockResolvedValue(1),
        },
      } as unknown as IInMemoryDatabaseProvider,
      {
        updateMany: revokeGrantsMock,
      } as unknown as IMcpAuthorizationGrantRepository,
    );
  });

  it("should close user sessions", async () => {
    const user = parse(User, {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone_number: faker.phone.number(),
    });

    const userAuthProviderConn = parse(UserAuthProviderConn, {
      user_id: user.id,
      auth_provider: "firebase",
    });

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(
      userAuthProviderConn,
    );

    authenticationMethod.revokeTokens.mockResolvedValueOnce();

    await userSessionsCloseService.execute({
      user,
      language: "en",
    });

    expect(authenticationMethod.revokeTokens).toHaveBeenCalledOnce();
    expect(authenticationMethod.revokeTokens).toHaveBeenCalledWith(
      userAuthProviderConn,
      "en",
    );
    expect(incrSessionsEpochMock).toHaveBeenCalledWith(
      `${MCP_AUTHORIZATION_SESSIONS_EPOCH_KEY_PREFIX}${user.id}`,
    );
    expect(revokeGrantsMock).toHaveBeenCalledWith(
      { user_id: user.id, active: true },
      { revoked_at: expect.any(Date) },
    );
  });

  it("should end MCP access both before and after the sign-in tokens are revoked, so a consent approved while they were still valid cannot outlive the close", async () => {
    const user = parse(User, { id: faker.string.uuid() });
    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(
      parse(UserAuthProviderConn, { user_id: user.id }),
    );
    authenticationMethod.revokeTokens.mockResolvedValueOnce();

    await userSessionsCloseService.execute({ user, language: "en" });

    const [revokeOrder] =
      authenticationMethod.revokeTokens.mock.invocationCallOrder;
    const endOrders = revokeGrantsMock.mock.invocationCallOrder;
    expect(revokeGrantsMock.mock.calls).toEqual([
      [{ user_id: user.id, active: true }, { revoked_at: expect.any(Date) }],
      [{ user_id: user.id, active: true }, { revoked_at: expect.any(Date) }],
    ]);
    expect(endOrders[0]).toBeLessThan(revokeOrder);
    expect(endOrders[1]).toBeGreaterThan(revokeOrder);
  });

  it("should fail, and leave the sign-in tokens for a retry, when the MCP connections cannot be revoked", async () => {
    const user = parse(User, { id: faker.string.uuid() });
    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(
      parse(UserAuthProviderConn, { user_id: user.id }),
    );
    revokeGrantsMock.mockRejectedValueOnce(new Error("database is down"));

    await expect(
      userSessionsCloseService.execute({ user, language: "en" }),
    ).rejects.toThrowError("database is down");
    expect(authenticationMethod.revokeTokens).not.toHaveBeenCalled();
  });

  it("should throw an error if no user auth provider conn is found", async () => {
    const user = parse(User, {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone_number: faker.phone.number(),
    });

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      userSessionsCloseService.execute({
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_session_close/NO_AUTH_PROVIDER_ACCOUNT_FOUND",
      }),
    );
    expect(incrSessionsEpochMock).not.toHaveBeenCalled();
    expect(revokeGrantsMock).not.toHaveBeenCalled();
  });
});

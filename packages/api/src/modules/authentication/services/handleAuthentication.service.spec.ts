import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Entity import
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// DTO import
import { IAuthenticationProviderSessionDTO } from "@shared/container/providers/AuthenticationProvider/types/IVerifyToken.dto";

// Provider import
import {
  IAuthenticationMethod,
  IAuthenticationProvider,
} from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";

// Repository import
import { IUserAuthProviderConnRepository } from "@modules/user/repositories/IUserAuthProviderConn.repository";
import { IUserRepository } from "@modules/user/repositories/IUser.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { HandleAuthenticationService } from "./handleAuthentication.service";

describe("Service: HandleAuthenticationService", () => {
  let authenticationProviderMock: Mocked<IAuthenticationProvider>;
  let authenticationMethodMock: Mocked<IAuthenticationMethod>;
  let userAuthProviderConnRepositoryMock: Mocked<IUserAuthProviderConnRepository>;
  let userRepositoryMock: Mocked<IUserRepository>;

  let handleAuthenticationService: HandleAuthenticationService;

  const buildSession = (
    override: Partial<IAuthenticationProviderSessionDTO> = {},
  ): IAuthenticationProviderSessionDTO => ({
    access_token: faker.string.alphanumeric(20),
    access_token_expires_at: faker.date.future(),
    refresh_token: faker.string.alphanumeric(20),
    refresh_token_expires_at: faker.date.future(),
    user_code: faker.string.uuid(),
    payload: {},
    auth_provider: AUTH_PROVIDER.FIREBASE,
    ...override,
  });

  const buildConn = (): UserAuthProviderConn => {
    const user = userFactory.build();
    return parse(UserAuthProviderConn, {
      id: faker.string.uuid(),
      auth_provider: AUTH_PROVIDER.FIREBASE,
      code: faker.string.uuid(),
      payload: {},
      disconnected_at: null,
      user_id: user.id,
      user,
    } satisfies Partial<UserAuthProviderConn>);
  };

  beforeEach(() => {
    authenticationMethodMock = {
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
      default_auth_provider: AUTH_PROVIDER.FIREBASE,
      initialization: Promise.resolve(),
      getProvider: vi.fn().mockResolvedValue(authenticationMethodMock),
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

    userRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    handleAuthenticationService = new HandleAuthenticationService(
      authenticationProviderMock,
      userAuthProviderConnRepositoryMock,
      userRepositoryMock,
    );
  });

  it("should authenticate and return a session with an explicit auth provider", async () => {
    const conn = buildConn();
    const session = buildSession();

    authenticationMethodMock.verifyAccessToken.mockResolvedValueOnce(session);
    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(conn);

    const response = await handleAuthenticationService.execute({
      access_token: session.access_token,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      language: "en",
    });

    expect(response.user.id).toBe(conn.user.id);
    expect(response.user_auth_provider_conn.id).toBe(conn.id);
    expect(authenticationProviderMock.getProvider).toHaveBeenCalledWith(
      AUTH_PROVIDER.FIREBASE,
    );
  });

  it("should fall back to the default auth provider when none is provided", async () => {
    const conn = buildConn();
    const session = buildSession();

    authenticationMethodMock.verifyAccessToken.mockResolvedValueOnce(session);
    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(conn);

    await handleAuthenticationService.execute({
      access_token: session.access_token,
      language: "en",
    });

    expect(authenticationProviderMock.getProvider).toHaveBeenCalledWith(
      AUTH_PROVIDER.FIREBASE,
    );
  });

  it("should throw if the access token is expired", async () => {
    const session = buildSession({
      access_token_expires_at: faker.date.past(),
    });

    authenticationMethodMock.verifyAccessToken.mockResolvedValueOnce(session);

    await expect(() =>
      handleAuthenticationService.execute({
        access_token: session.access_token,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_authentication_service/EXPIRED_TOKEN",
      }),
    );
  });
});

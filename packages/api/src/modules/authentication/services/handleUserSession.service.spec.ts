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
import { IAuthenticationMethod } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";

// Repository import
import { IUserAuthProviderConnRepository } from "@modules/user/repositories/IUserAuthProviderConn.repository";
import { IUserRepository } from "@modules/user/repositories/IUser.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { HandleUserSessionService } from "./handleUserSession.service";

describe("Service: HandleUserSessionService", () => {
  let userAuthProviderConnRepositoryMock: Mocked<IUserAuthProviderConnRepository>;
  let userRepositoryMock: Mocked<IUserRepository>;
  let authenticationMethodMock: Mocked<IAuthenticationMethod>;

  let handleUserSessionService: HandleUserSessionService;

  const buildSession = (
    override: Partial<IAuthenticationProviderSessionDTO> = {},
  ): IAuthenticationProviderSessionDTO => ({
    access_token: faker.string.alphanumeric(20),
    access_token_expires_at: faker.date.future(),
    refresh_token: faker.string.alphanumeric(20),
    refresh_token_expires_at: faker.date.future(),
    user_code: faker.string.uuid(),
    payload: { foo: "bar" },
    auth_provider: AUTH_PROVIDER.FIREBASE,
    ...override,
  });

  const buildConn = (
    override: Partial<UserAuthProviderConn> = {},
  ): UserAuthProviderConn => {
    const user = userFactory.build();
    return parse(UserAuthProviderConn, {
      id: faker.string.uuid(),
      auth_provider: AUTH_PROVIDER.FIREBASE,
      code: faker.string.uuid(),
      payload: {},
      disconnected_at: null,
      user_id: user.id,
      user,
      ...override,
    } satisfies Partial<UserAuthProviderConn>);
  };

  beforeEach(() => {
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

    handleUserSessionService = new HandleUserSessionService(
      userAuthProviderConnRepositoryMock,
      userRepositoryMock,
    );
  });

  it("should return a session when the auth provider conn already exists", async () => {
    const conn = buildConn();
    const session = buildSession();

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(conn);

    const response = await handleUserSessionService.execute({
      user_auth_provider_session: session,
      authenticationProvider: authenticationMethodMock,
      agent_info: { browser: "Chrome" } as any,
      language: "en",
    });

    expect(response.user_auth_provider_conn).toBe(conn);
    expect(response.access_token).toBe(session.access_token);
    expect(response.payload).toMatchObject({
      foo: "bar",
      agent_info: { browser: "Chrome" },
    });
  });

  it("should return a session without optional fields when they are absent", async () => {
    const conn = buildConn();
    const session = buildSession({
      refresh_token: undefined,
      refresh_token_expires_at: undefined,
      payload: undefined as any,
    });

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(conn);

    const response = await handleUserSessionService.execute({
      user_auth_provider_session: session,
      authenticationProvider: authenticationMethodMock,
      language: "en",
    });

    expect(response.refresh_token).toBeNull();
    expect(response.refresh_token_expires_at).toBeNull();
    expect(response.payload).toEqual({});
  });

  it("should create the user and the auth provider conn when none exists", async () => {
    const user = userFactory.build();
    const session = buildSession();
    const conn = buildConn({ user, user_id: user.id });

    userAuthProviderConnRepositoryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    authenticationMethodMock.getUserByAuthProviderSession.mockResolvedValueOnce(
      {
        code: session.user_code,
        email: user.email,
        name: user.name,
        phone_number: user.phone_number,
        password_hash: "hash",
        auth_provider: AUTH_PROVIDER.FIREBASE,
      },
    );
    userRepositoryMock.findOne.mockResolvedValueOnce(null);
    userRepositoryMock.createOne.mockResolvedValueOnce(user);
    userAuthProviderConnRepositoryMock.createOne.mockResolvedValueOnce(conn);

    const response = await handleUserSessionService.execute({
      user_auth_provider_session: session,
      authenticationProvider: authenticationMethodMock,
      language: "en",
    });

    expect(response.user_auth_provider_conn).toBe(conn);
    expect(userRepositoryMock.createOne).toHaveBeenCalledTimes(1);
    expect(userAuthProviderConnRepositoryMock.createOne).toHaveBeenCalledTimes(
      1,
    );
  });

  it("should reuse the existing user when found by email", async () => {
    const user = userFactory.build();
    const session = buildSession();
    const conn = buildConn({ user, user_id: user.id });

    userAuthProviderConnRepositoryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    authenticationMethodMock.getUserByAuthProviderSession.mockResolvedValueOnce(
      {
        code: session.user_code,
        email: user.email,
        name: null,
        phone_number: null,
        auth_provider: AUTH_PROVIDER.FIREBASE,
      },
    );
    userRepositoryMock.findOne.mockResolvedValueOnce(user);
    userAuthProviderConnRepositoryMock.createOne.mockResolvedValueOnce(conn);

    const response = await handleUserSessionService.execute({
      user_auth_provider_session: session,
      authenticationProvider: authenticationMethodMock,
      language: "en",
    });

    expect(response.user_auth_provider_conn).toBe(conn);
    expect(userRepositoryMock.createOne).not.toHaveBeenCalled();
  });

  it("should throw if the conn does not exist and only existing users are allowed", async () => {
    const session = buildSession();

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      handleUserSessionService.execute({
        allow_existing_only: true,
        user_auth_provider_session: session,
        authenticationProvider: authenticationMethodMock,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_user_session_service/USER_NOT_FOUND",
      }),
    );
  });

  it("should throw USER_NOT_FOUND when the user creation fails", async () => {
    const session = buildSession();

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(null);
    authenticationMethodMock.getUserByAuthProviderSession.mockResolvedValueOnce(
      {
        code: session.user_code,
        email: faker.internet.email(),
        auth_provider: AUTH_PROVIDER.FIREBASE,
      },
    );
    userRepositoryMock.findOne.mockResolvedValueOnce(null);
    userRepositoryMock.createOne.mockRejectedValueOnce(new Error());

    await expect(() =>
      handleUserSessionService.execute({
        user_auth_provider_session: session,
        authenticationProvider: authenticationMethodMock,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_user_session_service/USER_NOT_FOUND",
      }),
    );
  });

  it("should throw UNEXPECTED_ERROR when a non-AppError is raised", async () => {
    const session = buildSession();

    userAuthProviderConnRepositoryMock.findOne.mockRejectedValueOnce(
      new Error("boom"),
    );

    await expect(() =>
      handleUserSessionService.execute({
        user_auth_provider_session: session,
        authenticationProvider: authenticationMethodMock,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_user_session_service/UNEXPECTED_ERROR",
      }),
    );
  });

  it("should throw INVALID_SESSION_REGISTRY when the conn is disconnected", async () => {
    const conn = buildConn({ disconnected_at: new Date() });
    const session = buildSession();

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(conn);

    await expect(() =>
      handleUserSessionService.execute({
        user_auth_provider_session: session,
        authenticationProvider: authenticationMethodMock,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_user_session_service/INVALID_SESSION_REGISTRY",
      }),
    );
  });
});

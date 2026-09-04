import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Entity import
import { User } from "@modules/user/entities/user.entity";

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
import { HandleUserSessionService } from "./handleUserSession.service";

describe("Service: HandleUserSessionService", () => {
  let userAuthProviderConnRepository: IUserAuthProviderConnRepository;
  let userRepository: IUserRepository;
  let authenticationMethod: IAuthenticationMethod;

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

  beforeEach(async () => {
    userAuthProviderConnRepository = container.resolve(
      "UserAuthProviderConnRepository",
    );
    userRepository = container.resolve("UserRepository");

    const authenticationProvider = container.resolve<IAuthenticationProvider>(
      "AuthenticationProvider",
    );
    authenticationMethod = await authenticationProvider.getProvider(
      AUTH_PROVIDER.FIREBASE,
    );

    handleUserSessionService = new HandleUserSessionService(
      userAuthProviderConnRepository,
      userRepository,
    );
  });

  it("should return a session when the auth provider conn already exists", async () => {
    const user = await userFactory.create();
    const conn = await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: faker.string.uuid(),
    });
    const session = buildSession({ user_code: conn.code });

    const response = await handleUserSessionService.execute({
      user_auth_provider_session: session,
      authenticationProvider: authenticationMethod,
      agent_info: { browser: "Chrome" } as any,
      language: "en",
    });

    expect(response.user_auth_provider_conn.id).toBe(conn.id);
    expect(response.access_token).toBe(session.access_token);
    expect(response.payload).toMatchObject({
      foo: "bar",
      agent_info: { browser: "Chrome" },
    });
  });

  it("should return a session without optional fields when they are absent", async () => {
    const user = await userFactory.create();
    const conn = await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: faker.string.uuid(),
    });
    const session = buildSession({
      user_code: conn.code,
      refresh_token: undefined,
      refresh_token_expires_at: undefined,
      payload: undefined as any,
    });

    const response = await handleUserSessionService.execute({
      user_auth_provider_session: session,
      authenticationProvider: authenticationMethod,
      language: "en",
    });

    expect(response.refresh_token).toBeNull();
    expect(response.refresh_token_expires_at).toBeNull();
    expect(response.payload).toEqual({});
  });

  it("should create the user and the auth provider conn when none exists", async () => {
    const session = buildSession();
    const email = faker.internet.email();

    vi.spyOn(
      authenticationMethod,
      "getUserByAuthProviderSession",
    ).mockResolvedValueOnce({
      code: session.user_code,
      email,
      name: faker.person.fullName(),
      phone_number: faker.phone.number(),
      password_hash: "hash",
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });

    const response = await handleUserSessionService.execute({
      user_auth_provider_session: session,
      authenticationProvider: authenticationMethod,
      language: "en",
    });

    expect(response.user_auth_provider_conn.user.email).toBe(email);

    const createdUser = await userRepository.findOne({ email });
    expect(createdUser).not.toBeNull();
  });

  it("should reuse the existing user when found by email", async () => {
    const existingUser = await userFactory.create();
    const session = buildSession();

    vi.spyOn(
      authenticationMethod,
      "getUserByAuthProviderSession",
    ).mockResolvedValueOnce({
      code: session.user_code,
      email: existingUser.email,
      name: null,
      phone_number: null,
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });

    const response = await handleUserSessionService.execute({
      user_auth_provider_session: session,
      authenticationProvider: authenticationMethod,
      language: "en",
    });

    expect(response.user_auth_provider_conn.user_id).toBe(existingUser.id);
  });

  it("should throw if the conn does not exist and only existing users are allowed", async () => {
    const session = buildSession();

    await expect(() =>
      handleUserSessionService.execute({
        allow_existing_only: true,
        user_auth_provider_session: session,
        authenticationProvider: authenticationMethod,
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

    vi.spyOn(
      authenticationMethod,
      "getUserByAuthProviderSession",
    ).mockResolvedValueOnce({
      code: session.user_code,
      email: faker.internet.email(),
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });
    vi.spyOn(userRepository, "createOne").mockRejectedValueOnce(new Error());

    await expect(() =>
      handleUserSessionService.execute({
        user_auth_provider_session: session,
        authenticationProvider: authenticationMethod,
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

    vi.spyOn(userAuthProviderConnRepository, "findOne").mockRejectedValueOnce(
      new Error("boom"),
    );

    await expect(() =>
      handleUserSessionService.execute({
        user_auth_provider_session: session,
        authenticationProvider: authenticationMethod,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_user_session_service/UNEXPECTED_ERROR",
      }),
    );
  });

  it("should throw INVALID_SESSION_REGISTRY when the conn is disconnected", async () => {
    // The real repository's findOne (called here without include_disconnected)
    // always filters disconnected rows out, so this guard can never be reached
    // through the default lookup — override findOne for this one call to
    // simulate the state the guard defends against, same as the disconnected
    // real conn we just persisted.
    const user = await userFactory.create();
    const conn = await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: faker.string.uuid(),
    });
    const disconnectedConn = await userAuthProviderConnRepository.updateOne(
      { id: conn.id, include_disconnected: true },
      { disconnected_at: new Date() },
    );
    vi.spyOn(userAuthProviderConnRepository, "findOne").mockResolvedValueOnce(
      disconnectedConn,
    );
    const session = buildSession({ user_code: conn.code });

    await expect(() =>
      handleUserSessionService.execute({
        user_auth_provider_session: session,
        authenticationProvider: authenticationMethod,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_user_session_service/INVALID_SESSION_REGISTRY",
      }),
    );
  });
});

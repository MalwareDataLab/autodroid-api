import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

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
  let authenticationProvider: IAuthenticationProvider;
  let authenticationMethod: IAuthenticationMethod;
  let userAuthProviderConnRepository: IUserAuthProviderConnRepository;
  let userRepository: IUserRepository;

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

  beforeEach(async () => {
    authenticationProvider = container.resolve("AuthenticationProvider");
    authenticationMethod = await authenticationProvider.getProvider(
      AUTH_PROVIDER.FIREBASE,
    );
    userAuthProviderConnRepository = container.resolve(
      "UserAuthProviderConnRepository",
    );
    userRepository = container.resolve("UserRepository");

    handleAuthenticationService = new HandleAuthenticationService(
      authenticationProvider,
      userAuthProviderConnRepository,
      userRepository,
    );
  });

  it("should authenticate and return a session with an explicit auth provider", async () => {
    const user = await userFactory.create();
    const conn = await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: faker.string.uuid(),
    });
    const session = buildSession({ user_code: conn.code });

    vi.spyOn(authenticationMethod, "verifyAccessToken").mockResolvedValueOnce(
      session,
    );

    const response = await handleAuthenticationService.execute({
      access_token: session.access_token,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      language: "en",
    });

    expect(response.user.id).toBe(user.id);
    expect(response.user_auth_provider_conn.id).toBe(conn.id);
  });

  it("should fall back to the default auth provider when none is provided", async () => {
    const user = await userFactory.create();
    const conn = await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: faker.string.uuid(),
    });
    const session = buildSession({ user_code: conn.code });

    const getProviderSpy = vi.spyOn(authenticationProvider, "getProvider");
    vi.spyOn(authenticationMethod, "verifyAccessToken").mockResolvedValueOnce(
      session,
    );

    await handleAuthenticationService.execute({
      access_token: session.access_token,
      language: "en",
    });

    expect(getProviderSpy).toHaveBeenCalledWith(AUTH_PROVIDER.FIREBASE);
  });

  it("should throw if the access token is expired", async () => {
    const session = buildSession({
      access_token_expires_at: faker.date.past(),
    });

    vi.spyOn(authenticationMethod, "verifyAccessToken").mockResolvedValueOnce(
      session,
    );

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

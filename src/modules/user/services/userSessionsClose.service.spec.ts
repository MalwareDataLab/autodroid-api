import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

import {
  IAuthenticationMethod,
  IAuthenticationProvider,
} from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";
import { faker } from "@faker-js/faker";
import { parse } from "@shared/utils/instanceParser";
import { IUserAuthProviderConnRepository } from "../repositories/IUserAuthProviderConn.repository";
import { UserSessionsCloseService } from "./userSessionsClose.service";
import { UserAuthProviderConn } from "../entities/userAuthProviderConn.entity";
import { User } from "../entities/user.entity";

describe("Service: UserSessionsCloseService", () => {
  let authenticationProviderMock: Mocked<IAuthenticationProvider>;
  let userAuthProviderConnRepositoryMock: Mocked<IUserAuthProviderConnRepository>;

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

    userSessionsCloseService = new UserSessionsCloseService(
      authenticationProviderMock,
      userAuthProviderConnRepositoryMock,
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
  });

  it("should throw an error if no user auth provider conn is found", async () => {
    const user = parse(User, {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone_number: faker.phone.number(),
    });

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(null);

    expect(
      userSessionsCloseService.execute({
        user,
        language: "en",
      }),
    ).rejects.toThrowError();
  });
});

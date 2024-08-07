import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

import {
  IAuthenticationMethod,
  IAuthenticationProvider,
} from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";
import { faker } from "@faker-js/faker";
import { parse } from "@shared/utils/instanceParser";
import { IUserAuthProviderConnRepository } from "../repositories/IUserAuthProviderConn.repository";
import { UserAuthProviderConn } from "../entities/userAuthProviderConn.entity";
import { User } from "../entities/user.entity";
import { UserUpdateDataService } from "./userUpdateData.service";
import { IUserRepository } from "../repositories/IUser.repository";

describe("Service: UserUpdateDataService", () => {
  let userRepositoryMock: Mocked<IUserRepository>;
  let userAuthProviderConnRepositoryMock: Mocked<IUserAuthProviderConnRepository>;
  let authenticationProviderMock: Mocked<IAuthenticationProvider>;
  let authenticationMethodMock: Mocked<IAuthenticationMethod>;

  let userUpdateDataService: UserUpdateDataService;

  beforeEach(() => {
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
    };

    authenticationProviderMock = {
      initialization: Promise.resolve(),
      getProvider: vi.fn((_: AUTH_PROVIDER) =>
        Promise.resolve(authenticationMethodMock as IAuthenticationMethod),
      ),
      default_auth_provider: AUTH_PROVIDER.FIREBASE,
    };

    userAuthProviderConnRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    userUpdateDataService = new UserUpdateDataService(
      userRepositoryMock,
      userAuthProviderConnRepositoryMock,
      authenticationProviderMock,
    );
  });

  it("should update user data", async () => {
    const user = parse(User, {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone_number: faker.phone.number(),
    });

    const data = {
      name: `${faker.person.fullName()}updated`,
    };

    const userAuthProviderConn = parse(UserAuthProviderConn, {
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(
      userAuthProviderConn,
    );

    authenticationMethodMock.updateUserByCode.mockResolvedValueOnce({
      ...user,
      ...data,
      code: faker.string.uuid(),
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });

    userRepositoryMock.updateOne.mockResolvedValueOnce(user);

    const response = await userUpdateDataService.execute({
      user,
      data,
      language: "en",
    });

    expect(response).toEqual(user);

    expect(authenticationMethodMock.updateUserByCode).toHaveBeenCalledOnce();

    expect(userRepositoryMock.updateOne).toHaveBeenCalledOnce();
  });

  it("should throw an error if user auth provider conn is not found", async () => {
    const user = parse(User, {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone_number: faker.phone.number(),
    });

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(null);

    const data = {
      name: `${faker.person.fullName()}updated`,
    };

    expect(
      userUpdateDataService.execute({
        user,
        data,
        language: "en",
      }),
    ).rejects.toThrowError();
  });

  it("should throw an error if language is invalid", async () => {
    const user = parse(User, {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone_number: faker.phone.number(),
    });

    const data = {
      name: `${faker.person.fullName()}updated`,
      language: "wrong",
    };

    const userAuthProviderConn = parse(UserAuthProviderConn, {
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(
      userAuthProviderConn,
    );

    authenticationMethodMock.updateUserByCode.mockResolvedValueOnce({
      ...user,
      ...data,
      code: faker.string.uuid(),
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });

    userRepositoryMock.updateOne.mockResolvedValueOnce(user);

    expect(
      userUpdateDataService.execute({
        user,
        data,
        language: "en",
      }),
    ).rejects.toThrowError();
  });

  it("should throw if user was not found after update", async () => {
    const user = parse(User, {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone_number: faker.phone.number(),
    });

    const data = {
      name: `${faker.person.fullName()}updated`,
    };

    const userAuthProviderConn = parse(UserAuthProviderConn, {
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(
      userAuthProviderConn,
    );

    authenticationMethodMock.updateUserByCode.mockResolvedValueOnce({
      ...user,
      ...data,
      code: faker.string.uuid(),
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });

    userRepositoryMock.updateOne.mockResolvedValueOnce(null);

    expect(
      userUpdateDataService.execute({
        user,
        data,
        language: "en",
      }),
    ).rejects.toThrowError();
  });
});

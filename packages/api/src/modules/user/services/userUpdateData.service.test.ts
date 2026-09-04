import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Provider import
import { IAuthenticationProvider } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Repository import
import { IUserRepository } from "../repositories/IUser.repository";
import { IUserAuthProviderConnRepository } from "../repositories/IUserAuthProviderConn.repository";

// Factory import
import { userFactory } from "../entities/factories/user.factory";

// Service import
import { UserUpdateDataService } from "./userUpdateData.service";

describe("Service: UserUpdateDataService", () => {
  let userRepository: IUserRepository;
  let userAuthProviderConnRepository: IUserAuthProviderConnRepository;
  let authenticationProvider: IAuthenticationProvider;

  let userUpdateDataService: UserUpdateDataService;

  beforeEach(() => {
    userRepository = container.resolve("UserRepository");
    userAuthProviderConnRepository = container.resolve(
      "UserAuthProviderConnRepository",
    );
    authenticationProvider = container.resolve("AuthenticationProvider");

    userUpdateDataService = new UserUpdateDataService(
      userRepository,
      userAuthProviderConnRepository,
      authenticationProvider,
    );
  });

  it("should update user data", async () => {
    const user = await userFactory.create();
    await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: faker.string.uuid(),
    });

    const authenticationMethod = await authenticationProvider.getProvider(
      AUTH_PROVIDER.FIREBASE,
    );
    const updateUserByCodeSpy = vi
      .spyOn(authenticationMethod, "updateUserByCode")
      .mockResolvedValueOnce({
        code: faker.string.uuid(),
        email: user.email,
        auth_provider: AUTH_PROVIDER.FIREBASE,
      });

    const newName = `${faker.person.fullName()}updated`;

    const response = await userUpdateDataService.execute({
      user,
      data: { name: newName },
      language: "en",
    });

    expect(response.name).toBe(newName);
    expect(updateUserByCodeSpy).toHaveBeenCalledOnce();

    const found = await userRepository.findOne({ id: user.id });
    expect(found?.name).toBe(newName);
  });

  it("should throw an error if user auth provider conn is not found", async () => {
    const user = await userFactory.create();

    await expect(
      userUpdateDataService.execute({
        user,
        data: { name: "Updated" },
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_update_data_service/USER_REGISTRY_IN_AUTH_PROVIDER_NOT_FOUND",
      }),
    );
  });

  it("should throw an error if language is invalid", async () => {
    const user = await userFactory.create();
    await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: faker.string.uuid(),
    });

    await expect(
      userUpdateDataService.execute({
        user,
        data: { name: "Updated", language: "wrong" },
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_update_data_service/INVALID_LANGUAGE",
      }),
    );
  });

  it("should throw if user was not found after update", async () => {
    const user = await userFactory.create();
    await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: faker.string.uuid(),
    });

    const authenticationMethod = await authenticationProvider.getProvider(
      AUTH_PROVIDER.FIREBASE,
    );
    vi.spyOn(authenticationMethod, "updateUserByCode").mockResolvedValueOnce({
      code: faker.string.uuid(),
      email: user.email,
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });
    vi.spyOn(userRepository, "updateOne").mockResolvedValueOnce(null);

    await expect(
      userUpdateDataService.execute({
        user,
        data: { name: "Updated" },
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_update_data_service/USER_NOT_FOUND_AFTER_UPDATE",
      }),
    );
  });
});

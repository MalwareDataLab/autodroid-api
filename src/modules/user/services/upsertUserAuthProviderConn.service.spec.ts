import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// i18n import
import { TFunction } from "@shared/i18n";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Entity import
import { UserAuthProviderConn } from "../entities/userAuthProviderConn.entity";

// Repository import
import { IUserAuthProviderConnRepository } from "../repositories/IUserAuthProviderConn.repository";

// Service import
import {
  IUpsertUserAuthProviderConnServiceRequest,
  UpsertUserAuthProviderConnService,
} from "./upsertUserAuthProviderConn.service";

describe("Service: UpsertUserAuthProviderConnService", () => {
  let userAuthProviderConnRepositoryMock: Mocked<IUserAuthProviderConnRepository>;

  let upsertUserAuthProviderConnService: UpsertUserAuthProviderConnService;

  beforeEach(() => {
    userAuthProviderConnRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };
    upsertUserAuthProviderConnService = new UpsertUserAuthProviderConnService(
      userAuthProviderConnRepositoryMock,
    );
  });

  it("should upsert a user auth provider conn", async () => {
    const data: IUpsertUserAuthProviderConnServiceRequest = {
      user_id: faker.string.uuid(),
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: { access_token: faker.string.alphanumeric(10) },
      code: faker.string.alphanumeric(10),
      t: vi.fn(
        (_key: string, _message: string) => _message,
      ) as unknown as TFunction,
    };

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(
      parse(UserAuthProviderConn, data),
    );

    userAuthProviderConnRepositoryMock.updateOne.mockResolvedValueOnce(
      parse(UserAuthProviderConn, data),
    );

    const response = await upsertUserAuthProviderConnService.execute(data);

    expect(response).toEqual(data);
  });

  it("should create a user auth provider conn", async () => {
    const data: IUpsertUserAuthProviderConnServiceRequest = {
      user_id: faker.string.uuid(),
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: { access_token: faker.string.alphanumeric(10) },
      code: faker.string.alphanumeric(10),
      t: vi.fn(
        (_key: string, _message: string) => _message,
      ) as unknown as TFunction,
    };

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(null);

    userAuthProviderConnRepositoryMock.createOne.mockResolvedValueOnce(
      parse(UserAuthProviderConn, data),
    );

    const response = await upsertUserAuthProviderConnService.execute(data);

    expect(response).toEqual(data);
  });

  it("should throw an error in case of creation failure", async () => {
    const data: IUpsertUserAuthProviderConnServiceRequest = {
      user_id: faker.string.uuid(),
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: { access_token: faker.string.alphanumeric(10) },
      code: faker.string.alphanumeric(10),
      t: vi.fn(
        (_key: string, _message: string) => _message,
      ) as unknown as TFunction,
    };

    userAuthProviderConnRepositoryMock.findOne.mockResolvedValueOnce(
      parse(UserAuthProviderConn, data),
    );

    userAuthProviderConnRepositoryMock.updateOne.mockResolvedValueOnce(null);

    await expect(
      upsertUserAuthProviderConnService.execute(data),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_auth_provider_conn_service/USER_AUTH_PROVIDER_CONN_NOT_FOUND",
      }),
    );
  });
});

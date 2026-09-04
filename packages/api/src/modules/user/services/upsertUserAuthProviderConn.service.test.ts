import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// i18n import
import { TFunction } from "@shared/i18n";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Repository import
import { IUserAuthProviderConnRepository } from "../repositories/IUserAuthProviderConn.repository";

// Factory import
import { userFactory } from "../entities/factories/user.factory";

// Service import
import {
  IUpsertUserAuthProviderConnServiceRequest,
  UpsertUserAuthProviderConnService,
} from "./upsertUserAuthProviderConn.service";

const t = vi.fn((_key: string, message: string) => message) as unknown as TFunction;

describe("Service: UpsertUserAuthProviderConnService", () => {
  let userAuthProviderConnRepository: IUserAuthProviderConnRepository;

  let upsertUserAuthProviderConnService: UpsertUserAuthProviderConnService;

  beforeEach(() => {
    userAuthProviderConnRepository = container.resolve(
      "UserAuthProviderConnRepository",
    );
    upsertUserAuthProviderConnService = new UpsertUserAuthProviderConnService(
      userAuthProviderConnRepository,
    );
  });

  it("should create a user auth provider conn when none exists", async () => {
    const user = await userFactory.create();

    const data: IUpsertUserAuthProviderConnServiceRequest = {
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: { access_token: faker.string.alphanumeric(10) },
      code: faker.string.alphanumeric(10),
      t,
    };

    const response = await upsertUserAuthProviderConnService.execute(data);

    expect(response).toMatchObject({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      code: data.code,
    });

    const found = await userAuthProviderConnRepository.findOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });
    expect(found?.id).toBe(response.id);
  });

  it("should upsert (reconnect) an existing user auth provider conn", async () => {
    const user = await userFactory.create();

    const existing = await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: faker.string.alphanumeric(10),
    });
    await userAuthProviderConnRepository.updateOne(
      { id: existing.id },
      { disconnected_at: new Date() },
    );

    const newCode = faker.string.alphanumeric(10);
    const data: IUpsertUserAuthProviderConnServiceRequest = {
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: { access_token: faker.string.alphanumeric(10) },
      code: newCode,
      t,
    };

    const response = await upsertUserAuthProviderConnService.execute(data);

    expect(response.id).toBe(existing.id);
    expect(response.code).toBe(newCode);
    expect(response.disconnected_at).toBeNull();
  });

  it("should throw if the reconnect update fails to persist", async () => {
    const user = await userFactory.create();

    await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: faker.string.alphanumeric(10),
    });

    vi.spyOn(userAuthProviderConnRepository, "updateOne").mockResolvedValueOnce(
      null,
    );

    const data: IUpsertUserAuthProviderConnServiceRequest = {
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: faker.string.alphanumeric(10),
      t,
    };

    await expect(
      upsertUserAuthProviderConnService.execute(data),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_auth_provider_conn_service/USER_AUTH_PROVIDER_CONN_NOT_FOUND",
      }),
    );
  });
});

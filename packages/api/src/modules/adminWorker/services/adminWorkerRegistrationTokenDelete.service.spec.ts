import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Repository import
import { IWorkerRegistrationTokenRepository } from "@modules/worker/repositories/IWorkerRegistrationToken.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Target import
import { AdminWorkerRegistrationTokenDeleteService } from "./adminWorkerRegistrationTokenDelete.service";

describe("Service: AdminWorkerRegistrationTokenDeleteService", () => {
  let workerRegistrationTokenRepositoryMock: Mocked<IWorkerRegistrationTokenRepository>;

  let adminWorkerRegistrationTokenDeleteService: AdminWorkerRegistrationTokenDeleteService;

  beforeEach(() => {
    workerRegistrationTokenRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
      activateOne: vi.fn(),
      releaseOne: vi.fn(),
    };

    adminWorkerRegistrationTokenDeleteService =
      new AdminWorkerRegistrationTokenDeleteService(
        workerRegistrationTokenRepositoryMock,
      );
  });

  it("should delete a worker registration token without returning its secret value", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const workerRegistrationToken = workerRegistrationTokenFactory.build();

    workerRegistrationTokenRepositoryMock.deleteOne.mockResolvedValueOnce(
      workerRegistrationToken,
    );

    const response = await adminWorkerRegistrationTokenDeleteService.execute({
      worker_registration_token_id: workerRegistrationToken.id,
      user,
      language: "en",
    });

    expect(response).toEqual({ ...workerRegistrationToken, token: null });
  });

  it("should throw if the worker registration token was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    workerRegistrationTokenRepositoryMock.deleteOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminWorkerRegistrationTokenDeleteService.execute({
        worker_registration_token_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_worker_registration_token_delete_service/WORKER_REGISTRATION_TOKEN_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminWorkerRegistrationTokenDeleteService.execute({
        worker_registration_token_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});

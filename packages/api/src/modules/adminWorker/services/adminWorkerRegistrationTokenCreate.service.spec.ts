import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Repository import
import { IWorkerRegistrationTokenRepository } from "@modules/worker/repositories/IWorkerRegistrationToken.repository";

// Service import
import { AdminWorkerRegistrationTokenCreateService } from "./adminWorkerRegistrationTokenCreate.service";

describe("Service: AdminWorkerRegistrationTokenCreateService", () => {
  let workerRegistrationTokenRepositoryMock: Mocked<IWorkerRegistrationTokenRepository>;

  let adminWorkerRegistrationTokenCreateService: AdminWorkerRegistrationTokenCreateService;

  beforeEach(() => {
    workerRegistrationTokenRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    adminWorkerRegistrationTokenCreateService =
      new AdminWorkerRegistrationTokenCreateService(
        workerRegistrationTokenRepositoryMock,
      );
  });

  it("should create a worker registration token with an expiration date", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const workerRegistrationToken = workerRegistrationTokenFactory.build();

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(null);
    workerRegistrationTokenRepositoryMock.createOne.mockResolvedValueOnce(
      workerRegistrationToken,
    );

    const expires_at = new Date();

    const response = await adminWorkerRegistrationTokenCreateService.execute({
      data: { expires_at, is_unlimited_usage: false },
      user,
      language: "en",
    });

    expect(response).toMatchObject(workerRegistrationToken);
    expect(
      workerRegistrationTokenRepositoryMock.createOne,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        expires_at,
        is_unlimited_usage: false,
        user_id: user.id,
        activated_at: null,
      }),
    );
  });

  it("should create a worker registration token without an expiration date", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const workerRegistrationToken = workerRegistrationTokenFactory.build();

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(null);
    workerRegistrationTokenRepositoryMock.createOne.mockResolvedValueOnce(
      workerRegistrationToken,
    );

    const response = await adminWorkerRegistrationTokenCreateService.execute({
      data: { is_unlimited_usage: true },
      user,
      language: "en",
    });

    expect(response).toMatchObject(workerRegistrationToken);
    expect(
      workerRegistrationTokenRepositoryMock.createOne,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        expires_at: null,
        is_unlimited_usage: true,
        user_id: user.id,
        activated_at: null,
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminWorkerRegistrationTokenCreateService.execute({
        data: { is_unlimited_usage: false },
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

import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";
import { IWorkerRegistrationTokenRepository } from "@modules/worker/repositories/IWorkerRegistrationToken.repository";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Schema import
import { WorkerRegisterSchema } from "@modules/worker/schemas/worker.schema";

// Service import
import { WorkerRegisterService } from "./workerRegister.service";

describe("Service: WorkerRegisterService", () => {
  let workerRegistrationTokenRepositoryMock: Mocked<IWorkerRegistrationTokenRepository>;
  let workerRepositoryMock: Mocked<IWorkerRepository>;

  let workerRegisterService: WorkerRegisterService;

  const buildRequestData = (
    registration_token_value: string,
  ): WorkerRegisterSchema => ({
    system_info: {},
    registration_token: registration_token_value,
    internal_id: "internal-id",
    signature: "signature",
    name: "worker-name",
  });

  beforeEach(() => {
    workerRegistrationTokenRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    workerRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    workerRegisterService = new WorkerRegisterService(
      workerRegistrationTokenRepositoryMock,
      workerRepositoryMock,
    );
  });

  it("should register a worker", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { refresh_token: "", archived_at: null },
      { associations: { registration_token } },
    );
    const updatedWorker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
      registration_token,
    );
    workerRepositoryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(worker);
    workerRepositoryMock.createOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(updatedWorker);

    const response = await workerRegisterService.execute({
      data: buildRequestData(registration_token.token),
    });

    expect(response).toBe(updatedWorker);
  });

  it("should throw if the registration token was not found", async () => {
    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData("missing-token"),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_register_service/REGISTRATION_TOKEN_NOT_FOUND",
      }),
    );
  });

  it("should throw if the signature was already used", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const existingWorker = workerFactory.build();

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
      registration_token,
    );
    workerRepositoryMock.findOne.mockResolvedValueOnce(existingWorker);

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(registration_token.token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_register_service/SIGNATURE_ALREADY_USED",
      }),
    );
  });

  it("should rethrow an app error raised while updating the refresh token", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { refresh_token: "", archived_at: null },
      { associations: { registration_token } },
    );

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
      registration_token,
    );
    workerRepositoryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    workerRepositoryMock.createOne.mockResolvedValueOnce(worker);

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(registration_token.token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_update_refresh_token_service/WORKER_NOT_FOUND",
      }),
    );
  });

  it("should throw a generic error when an unexpected error occurs", async () => {
    const registration_token = workerRegistrationTokenFactory.build();

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
      registration_token,
    );
    workerRepositoryMock.findOne.mockResolvedValueOnce(null);
    workerRepositoryMock.createOne.mockRejectedValueOnce(new Error("db down"));

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(registration_token.token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_register_service/FAIL_TO_REGISTER_WORKER",
      }),
    );
  });
});

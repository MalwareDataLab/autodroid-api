import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

// Util import
import { generateWorkerRefreshToken } from "@modules/worker/utils/generateWorkerToken.util";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Schema import
import { WorkerRefreshTokenSchema } from "@modules/worker/schemas/worker.schema";

// Service import
import { WorkerUpdateRefreshTokenService } from "./workerUpdateRefreshToken.service";

describe("Service: WorkerUpdateRefreshTokenService", () => {
  let workerRepositoryMock: Mocked<IWorkerRepository>;

  let workerUpdateRefreshTokenService: WorkerUpdateRefreshTokenService;

  const buildRequestData = (
    worker: ReturnType<typeof workerFactory.build>,
    registration_token_value: string,
    refresh_token: string,
  ): WorkerRefreshTokenSchema => ({
    name: worker.name ?? "",
    registration_token: registration_token_value,
    internal_id: worker.internal_id,
    signature: worker.signature,
    worker_id: worker.id,
    refresh_token,
    system_info: {},
  });

  beforeEach(() => {
    workerRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    workerUpdateRefreshTokenService = new WorkerUpdateRefreshTokenService(
      workerRepositoryMock,
    );
  });

  it("should update the refresh token skipping signature validation when there is no previous token", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null, refresh_token: "" },
      { associations: { registration_token } },
    );

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(worker);

    const response = await workerUpdateRefreshTokenService.execute({
      data: buildRequestData(worker, registration_token.token, ""),
    });

    expect(response).toBe(worker);
  });

  it("should update the refresh token validating a matching signature", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    const { token: refresh_token } = generateWorkerRefreshToken(worker);

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(worker);

    const response = await workerUpdateRefreshTokenService.execute({
      data: buildRequestData(worker, registration_token.token, refresh_token),
    });

    expect(response).toBe(worker);
  });

  it("should throw if the worker was not found", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null, refresh_token: "" },
      { associations: { registration_token } },
    );

    workerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      workerUpdateRefreshTokenService.execute({
        data: buildRequestData(worker, registration_token.token, ""),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_update_refresh_token_service/WORKER_NOT_FOUND",
      }),
    );
  });

  it("should throw if the worker is archived", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: new Date(), refresh_token: "" },
      { associations: { registration_token } },
    );

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);

    await expect(() =>
      workerUpdateRefreshTokenService.execute({
        data: buildRequestData(worker, registration_token.token, ""),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_update_refresh_token_service/WORKER_ARCHIVED",
      }),
    );
  });

  it("should throw if the token signature does not match", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );
    const otherWorker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    const { token: refresh_token } = generateWorkerRefreshToken(worker);

    workerRepositoryMock.findOne.mockResolvedValueOnce(otherWorker);

    await expect(() =>
      workerUpdateRefreshTokenService.execute({
        data: buildRequestData(worker, registration_token.token, refresh_token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_update_refresh_token_service/INVALID_SIGNATURE",
      }),
    );
  });

  it("should validate the signature when the worker already has a refresh token", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);

    await expect(() =>
      workerUpdateRefreshTokenService.execute({
        data: buildRequestData(worker, registration_token.token, ""),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@process_and_validate_worker_token/INVALID_TOKEN",
      }),
    );
  });

  it("should throw if the worker was not updated", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null, refresh_token: "" },
      { associations: { registration_token } },
    );

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(null);

    await expect(() =>
      workerUpdateRefreshTokenService.execute({
        data: buildRequestData(worker, registration_token.token, ""),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_update_refresh_token_service/WORKER_NOT_UPDATED",
      }),
    );
  });

  it("should throw a generic error when an unexpected error occurs", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null, refresh_token: "" },
      { associations: { registration_token } },
    );

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockRejectedValueOnce(new Error("db down"));

    await expect(() =>
      workerUpdateRefreshTokenService.execute({
        data: buildRequestData(worker, registration_token.token, ""),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_update_refresh_token_service/FAIL_TO_GENERATE_REFRESH_TOKEN",
      }),
    );
  });
});

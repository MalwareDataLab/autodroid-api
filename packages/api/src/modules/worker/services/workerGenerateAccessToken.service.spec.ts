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
import { WorkerGenerateAccessTokenService } from "./workerGenerateAccessToken.service";

describe("Service: WorkerGenerateAccessTokenService", () => {
  let workerRepositoryMock: Mocked<IWorkerRepository>;

  let workerGenerateAccessTokenService: WorkerGenerateAccessTokenService;

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

    workerGenerateAccessTokenService = new WorkerGenerateAccessTokenService(
      workerRepositoryMock,
    );
  });

  it("should generate an access token", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    const { token: refresh_token } = generateWorkerRefreshToken(worker);

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(worker);

    const response = await workerGenerateAccessTokenService.execute({
      data: buildRequestData(worker, registration_token.token, refresh_token),
    });

    expect(response.access_token).toBeTypeOf("string");
    expect(response.access_token_expires_at).toBeInstanceOf(Date);
  });

  it("should throw if the worker was not found", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    const { token: refresh_token } = generateWorkerRefreshToken(worker);

    workerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      workerGenerateAccessTokenService.execute({
        data: buildRequestData(worker, registration_token.token, refresh_token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_access_token_service/WORKER_NOT_FOUND",
      }),
    );
  });

  it("should throw if the worker is archived", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: new Date() },
      { associations: { registration_token } },
    );

    const { token: refresh_token } = generateWorkerRefreshToken(worker);

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);

    await expect(() =>
      workerGenerateAccessTokenService.execute({
        data: buildRequestData(worker, registration_token.token, refresh_token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_access_token_service/WORKER_ARCHIVED",
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
      workerGenerateAccessTokenService.execute({
        data: buildRequestData(worker, registration_token.token, refresh_token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_access_token_service/INVALID_SIGNATURE",
      }),
    );
  });

  it("should throw if the worker was not updated", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    const { token: refresh_token } = generateWorkerRefreshToken(worker);

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(null);

    await expect(() =>
      workerGenerateAccessTokenService.execute({
        data: buildRequestData(worker, registration_token.token, refresh_token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_access_token_service/WORKER_NOT_UPDATED",
      }),
    );
  });

  it("should rethrow the app error raised while decoding an invalid refresh token", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    await expect(() =>
      workerGenerateAccessTokenService.execute({
        data: buildRequestData(
          worker,
          registration_token.token,
          "invalid-refresh-token",
        ),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@process_and_validate_worker_token/INVALID_TOKEN",
      }),
    );
  });

  it("should throw a generic error when an unexpected error occurs", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    const { token: refresh_token } = generateWorkerRefreshToken(worker);

    workerRepositoryMock.findOne.mockRejectedValueOnce(new Error("db down"));

    await expect(() =>
      workerGenerateAccessTokenService.execute({
        data: buildRequestData(worker, registration_token.token, refresh_token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_access_token_service/FAIL_TO_GENERATE_ACCESS_TOKEN",
      }),
    );
  });
});

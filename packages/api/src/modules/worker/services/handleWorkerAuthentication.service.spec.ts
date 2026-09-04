import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

// Util import
import { generateWorkerAccessToken } from "@modules/worker/utils/generateWorkerToken.util";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Service import
import { HandleWorkerAuthenticationService } from "./handleWorkerAuthentication.service";

describe("Service: HandleWorkerAuthenticationService", () => {
  let workerRepositoryMock: Mocked<IWorkerRepository>;

  let handleWorkerAuthenticationService: HandleWorkerAuthenticationService;

  beforeEach(() => {
    workerRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    handleWorkerAuthenticationService = new HandleWorkerAuthenticationService(
      workerRepositoryMock,
    );
  });

  it("should return the worker session for a valid access token", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    const { token } = generateWorkerAccessToken(worker);

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);

    const response = await handleWorkerAuthenticationService.execute({
      access_token: token,
      language: "en",
    });

    expect(response.worker).toMatchObject({ id: worker.id });
  });

  it("should throw if the worker was not found", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    const { token } = generateWorkerAccessToken(worker);

    workerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      handleWorkerAuthenticationService.execute({
        access_token: token,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_worker_authentication_service/WORKER_NOT_FOUND",
      }),
    );
  });

  it("should throw if the worker is archived", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: new Date() },
      { associations: { registration_token } },
    );

    const { token } = generateWorkerAccessToken(worker);

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);

    await expect(() =>
      handleWorkerAuthenticationService.execute({
        access_token: token,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_worker_authentication_service/WORKER_ARCHIVED",
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

    const { token } = generateWorkerAccessToken(worker);

    workerRepositoryMock.findOne.mockResolvedValueOnce(otherWorker);

    await expect(() =>
      handleWorkerAuthenticationService.execute({
        access_token: token,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_worker_authentication_service/INVALID_SIGNATURE",
      }),
    );
  });

  it("should rethrow the app error raised while decoding an invalid token", async () => {
    await expect(() =>
      handleWorkerAuthenticationService.execute({
        access_token: "invalid-token",
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@process_and_validate_worker_token/INVALID_TOKEN",
      }),
    );
  });

  it("should throw an invalid token error when an unexpected error occurs", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    const { token } = generateWorkerAccessToken(worker);

    workerRepositoryMock.findOne.mockRejectedValueOnce(new Error("db down"));

    await expect(() =>
      handleWorkerAuthenticationService.execute({
        access_token: token,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_worker_authentication_service/INVALID_TOKEN",
      }),
    );
  });
});

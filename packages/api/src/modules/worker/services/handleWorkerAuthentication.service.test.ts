import { describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Repository import
import { IWorkerRepository } from "../repositories/IWorker.repository";

// Util import
import { generateWorkerAccessToken } from "../utils/generateWorkerToken.util";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "../entities/factories/workerRegistrationToken.factory";

// Service import
import { HandleWorkerAuthenticationService } from "./handleWorkerAuthentication.service";

describe("Service: HandleWorkerAuthenticationService", () => {
  const buildService = () =>
    new HandleWorkerAuthenticationService(
      container.resolve<IWorkerRepository>("WorkerRepository"),
    );

  it("should return the worker session for a valid access token", async () => {
    const registration_token = await workerRegistrationTokenFactory.create();
    const worker = await workerFactory.create({
      archived_at: null,
      registration_token_id: registration_token.id,
    });

    const { token } = generateWorkerAccessToken(worker);

    const response = await buildService().execute({
      access_token: token,
      language: "en",
    });

    expect(response.worker.id).toBe(worker.id);
  });

  it("should throw if the worker was not found", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    const { token } = generateWorkerAccessToken(worker);

    await expect(() =>
      buildService().execute({ access_token: token, language: "en" }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_worker_authentication_service/WORKER_NOT_FOUND",
      }),
    );
  });

  it("should throw if the worker is archived", async () => {
    const registration_token = await workerRegistrationTokenFactory.create();
    const worker = await workerFactory.create({
      archived_at: new Date(),
      registration_token_id: registration_token.id,
    });

    const { token } = generateWorkerAccessToken(worker);

    await expect(() =>
      buildService().execute({ access_token: token, language: "en" }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_worker_authentication_service/WORKER_ARCHIVED",
      }),
    );
  });

  it("should throw if the token signature no longer matches the persisted worker", async () => {
    const registration_token = await workerRegistrationTokenFactory.create();
    const worker = await workerFactory.create({
      archived_at: null,
      registration_token_id: registration_token.id,
    });

    const { token } = generateWorkerAccessToken(worker);

    const workerRepository =
      container.resolve<IWorkerRepository>("WorkerRepository");
    await workerRepository.updateOne(
      { id: worker.id },
      { signature: "a".repeat(64) },
    );

    await expect(() =>
      buildService().execute({ access_token: token, language: "en" }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_worker_authentication_service/INVALID_SIGNATURE",
      }),
    );
  });

  it("should rethrow the app error raised while decoding an invalid token", async () => {
    await expect(() =>
      buildService().execute({
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
    const registration_token = await workerRegistrationTokenFactory.create();
    const worker = await workerFactory.create({
      archived_at: null,
      registration_token_id: registration_token.id,
    });

    const { token } = generateWorkerAccessToken(worker);

    const workerRepository =
      container.resolve<IWorkerRepository>("WorkerRepository");
    vi.spyOn(workerRepository, "findOne").mockRejectedValueOnce(
      new Error("db down"),
    );

    await expect(() =>
      buildService().execute({ access_token: token, language: "en" }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_worker_authentication_service/INVALID_TOKEN",
      }),
    );
  });
});

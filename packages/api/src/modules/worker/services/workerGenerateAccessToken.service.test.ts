import { describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import crypto from "node:crypto";

// Repository import
import { IWorkerRepository } from "../repositories/IWorker.repository";

// Util import
import { generateWorkerRefreshToken } from "../utils/generateWorkerToken.util";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "../entities/factories/workerRegistrationToken.factory";

// Schema import
import { WorkerRefreshTokenSchema } from "../schemas/worker.schema";

// Entity import
import { Worker } from "../entities/worker.entity";

// Service import
import { WorkerGenerateAccessTokenService } from "./workerGenerateAccessToken.service";

describe("Service: WorkerGenerateAccessTokenService", () => {
  const buildService = () =>
    new WorkerGenerateAccessTokenService(
      container.resolve<IWorkerRepository>("WorkerRepository"),
    );

  const buildRequestData = (
    worker: Worker,
    registration_token_value: string,
    refresh_token: string,
  ): WorkerRefreshTokenSchema =>
    ({
      name: worker.name ?? "",
      registration_token: registration_token_value,
      internal_id: worker.internal_id,
      signature: worker.signature,
      worker_id: worker.id,
      refresh_token,
      system_info: { updated: true },
    }) as WorkerRefreshTokenSchema;

  // The repository matches `refresh_token` as a literal DB column, so a
  // freshly-created worker's persisted value must be overwritten with the
  // token we actually sign, mirroring how workerRegister/workerUpdateRefreshToken
  // persist the token they hand back to the client.
  const createWorkerWithValidRefreshToken = async (
    overrides: Partial<Worker>,
  ) => {
    const registration_token = await workerRegistrationTokenFactory.create();
    const worker = await workerFactory.create({
      ...overrides,
      registration_token_id: registration_token.id,
    });

    const { token: refresh_token } = generateWorkerRefreshToken(worker);

    const workerRepository =
      container.resolve<IWorkerRepository>("WorkerRepository");
    await workerRepository.updateOne({ id: worker.id }, { refresh_token });

    return { registration_token, worker, refresh_token };
  };

  it("should generate an access token and refresh the worker's agent/system info", async () => {
    const { registration_token, worker, refresh_token } =
      await createWorkerWithValidRefreshToken({ archived_at: null });

    const response = await buildService().execute({
      data: buildRequestData(worker, registration_token.token, refresh_token),
    });

    expect(response.access_token).toBeTypeOf("string");
    expect(response.access_token_expires_at).toBeInstanceOf(Date);

    const workerRepository =
      container.resolve<IWorkerRepository>("WorkerRepository");
    const updated = await workerRepository.findOne({ id: worker.id });
    expect(updated?.system_info).toMatchObject({ updated: true });
  });

  it("should throw if the worker was not found", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    const { token: refresh_token } = generateWorkerRefreshToken(worker);

    await expect(() =>
      buildService().execute({
        data: buildRequestData(worker, registration_token.token, refresh_token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_access_token_service/WORKER_NOT_FOUND",
      }),
    );
  });

  it("should throw if the worker is archived", async () => {
    const { registration_token, worker, refresh_token } =
      await createWorkerWithValidRefreshToken({ archived_at: new Date() });

    await expect(() =>
      buildService().execute({
        data: buildRequestData(worker, registration_token.token, refresh_token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_access_token_service/WORKER_ARCHIVED",
      }),
    );
  });

  it("should throw if the token signature no longer matches the persisted worker", async () => {
    const { registration_token, worker, refresh_token } =
      await createWorkerWithValidRefreshToken({ archived_at: null });

    // The repository's own lookup filters on internal_id/signature/registration_token
    // as literal equality, so the request must present values that match the
    // CURRENT row for the worker to be found at all — the token itself must be
    // the one that goes stale (signed before this rotation), mirroring a replayed
    // refresh token presented after the worker's credentials rotated.
    const rotated_internal_id = crypto.randomUUID();
    const workerRepository =
      container.resolve<IWorkerRepository>("WorkerRepository");
    await workerRepository.updateOne(
      { id: worker.id },
      { internal_id: rotated_internal_id },
    );

    await expect(() =>
      buildService().execute({
        data: buildRequestData(
          { ...worker, internal_id: rotated_internal_id } as Worker,
          registration_token.token,
          refresh_token,
        ),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_access_token_service/INVALID_SIGNATURE",
      }),
    );
  });

  it("should rethrow the app error raised while decoding an invalid refresh token", async () => {
    const registration_token = await workerRegistrationTokenFactory.create();
    const worker = await workerFactory.create({
      archived_at: null,
      registration_token_id: registration_token.id,
    });

    await expect(() =>
      buildService().execute({
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
    const { registration_token, worker, refresh_token } =
      await createWorkerWithValidRefreshToken({ archived_at: null });

    const workerRepository =
      container.resolve<IWorkerRepository>("WorkerRepository");
    vi.spyOn(workerRepository, "findOne").mockRejectedValueOnce(
      new Error("db down"),
    );

    await expect(() =>
      buildService().execute({
        data: buildRequestData(worker, registration_token.token, refresh_token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_access_token_service/FAIL_TO_GENERATE_ACCESS_TOKEN",
      }),
    );
  });
});

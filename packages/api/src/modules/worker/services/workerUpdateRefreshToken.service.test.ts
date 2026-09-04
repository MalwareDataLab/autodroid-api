import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Repository import
import { IWorkerRepository } from "../repositories/IWorker.repository";

// Util import
import { generateWorkerRefreshToken } from "../utils/generateWorkerToken.util";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "../entities/factories/workerRegistrationToken.factory";

// Schema import
import { WorkerRefreshTokenSchema } from "../schemas/worker.schema";

// Service import
import { WorkerUpdateRefreshTokenService } from "./workerUpdateRefreshToken.service";

describe("Service: WorkerUpdateRefreshTokenService", () => {
  let workerRepository: IWorkerRepository;

  let workerUpdateRefreshTokenService: WorkerUpdateRefreshTokenService;

  beforeEach(() => {
    workerRepository = container.resolve("WorkerRepository");

    workerUpdateRefreshTokenService = new WorkerUpdateRefreshTokenService(
      workerRepository,
    );
  });

  const buildRequestData = (
    worker: Awaited<ReturnType<typeof workerFactory.create>>,
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

  it("should update the refresh token skipping signature validation when there is no previous token", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create();
    const worker = await workerFactory.create({
      archived_at: null,
      refresh_token: "",
      registration_token_id: registrationToken.id,
    });

    const response = await workerUpdateRefreshTokenService.execute({
      data: buildRequestData(worker, registrationToken.token, ""),
    });

    expect(response).toEqual(expect.objectContaining({ id: worker.id }));
    expect(response.refresh_token).not.toBe("");
  });

  it("should update the refresh token validating a matching signature", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create();
    const worker = await workerFactory.create({
      archived_at: null,
      registration_token_id: registrationToken.id,
    });

    const { token: refresh_token } = generateWorkerRefreshToken(worker);
    await workerRepository.updateOne({ id: worker.id }, { refresh_token });

    const response = await workerUpdateRefreshTokenService.execute({
      data: buildRequestData(worker, registrationToken.token, refresh_token),
    });

    // HS256 signing is deterministic on {payload, secret, iat}; the payload
    // here carries no per-call entropy, so a re-issued token can legitimately
    // land on the same iat second and be byte-identical to the one just
    // validated — assert identity/shape only, not (in)equality with the old token.
    expect(response).toEqual(expect.objectContaining({ id: worker.id }));
    expect(typeof response.refresh_token).toBe("string");
    expect(response.refresh_token.length).toBeGreaterThan(0);
  });

  it("should throw if the worker was not found", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create();
    const worker = workerFactory.build({
      archived_at: null,
      refresh_token: "",
    });

    await expect(() =>
      workerUpdateRefreshTokenService.execute({
        data: {
          name: worker.name ?? "",
          registration_token: registrationToken.token,
          internal_id: worker.internal_id,
          signature: worker.signature,
          worker_id: faker.string.uuid(),
          refresh_token: "",
          system_info: {},
        },
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_update_refresh_token_service/WORKER_NOT_FOUND",
      }),
    );
  });

  it("should throw if the worker is archived", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create();
    const worker = await workerFactory.create({
      archived_at: new Date(),
      refresh_token: "",
      registration_token_id: registrationToken.id,
    });

    await expect(() =>
      workerUpdateRefreshTokenService.execute({
        data: buildRequestData(worker, registrationToken.token, ""),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_update_refresh_token_service/WORKER_ARCHIVED",
      }),
    );
  });

  it("should throw if the token signature does not match", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create();
    const worker = await workerFactory.create({
      archived_at: null,
      registration_token_id: registrationToken.id,
    });
    const otherWorker = workerFactory.build(
      {},
      {
        associations: {
          registration_token: workerRegistrationTokenFactory.build(),
        },
      },
    );

    const { token: refresh_token } = generateWorkerRefreshToken(otherWorker);
    // findOne requires the stored refresh_token to exactly match the request's,
    // so the real worker's record has to carry this mismatched-payload token
    // for the lookup to succeed and reach the signature check at all.
    await workerRepository.updateOne({ id: worker.id }, { refresh_token });

    await expect(() =>
      workerUpdateRefreshTokenService.execute({
        data: buildRequestData(worker, registrationToken.token, refresh_token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_update_refresh_token_service/INVALID_SIGNATURE",
      }),
    );
  });
});

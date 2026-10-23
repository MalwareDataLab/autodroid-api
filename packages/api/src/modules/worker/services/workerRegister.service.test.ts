import { faker } from "@faker-js/faker";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

// Schema import
import { WorkerRegisterSchema } from "../schemas/worker.schema";

// Repository import
import { IWorkerRepository } from "../repositories/IWorker.repository";
import { IWorkerRegistrationTokenRepository } from "../repositories/IWorkerRegistrationToken.repository";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "../entities/factories/workerRegistrationToken.factory";

// Target import
import { WorkerRegisterService } from "./workerRegister.service";

describe("Service: WorkerRegisterService", () => {
  let workerRegistrationTokenRepository: IWorkerRegistrationTokenRepository;
  let workerRepository: IWorkerRepository;

  let workerRegisterService: WorkerRegisterService;

  const buildRequestData = (
    registration_token_value: string,
    signature: string = faker.string.uuid(),
  ): WorkerRegisterSchema => ({
    system_info: {},
    registration_token: registration_token_value,
    internal_id: faker.string.uuid(),
    signature,
    name: faker.word.words(1),
  });

  beforeEach(() => {
    workerRegistrationTokenRepository = container.resolve(
      "WorkerRegistrationTokenRepository",
    );
    workerRepository = container.resolve("WorkerRepository");

    workerRegisterService = new WorkerRegisterService(
      workerRegistrationTokenRepository,
      workerRepository,
    );
  });

  it("should register a worker", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create();

    const response = await workerRegisterService.execute({
      data: buildRequestData(registrationToken.token),
    });

    expect(response).toEqual(
      expect.objectContaining({
        registration_token_id: registrationToken.id,
        user_id: registrationToken.user_id,
      }),
    );
    expect(response.refresh_token).not.toBe("");

    const persisted = await workerRepository.findOne({ id: response.id });
    expect(persisted).not.toBeNull();
  });

  it("should throw if the registration token was not found", async () => {
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
    const registrationToken = await workerRegistrationTokenFactory.create();
    const existingWorker = await workerFactory.create({ archived_at: null });

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(
          registrationToken.token,
          existingWorker.signature,
        ),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_register_service/SIGNATURE_ALREADY_USED",
      }),
    );
  });

  it("should mark a single-use registration token as activated", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create({
      is_unlimited_usage: false,
      activated_at: null,
    });

    await workerRegisterService.execute({
      data: buildRequestData(registrationToken.token),
    });

    const persistedToken = await workerRegistrationTokenRepository.findOne({
      id: registrationToken.id,
    });
    expect(persistedToken?.activated_at).toBeInstanceOf(Date);
  });

  it("should register a worker with a token that never expires", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create({
      expires_at: null,
    });

    const response = await workerRegisterService.execute({
      data: buildRequestData(registrationToken.token),
    });

    expect(response.registration_token_id).toBe(registrationToken.id);
  });

  it("should register a worker with a token that expires in the future", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create({
      expires_at: new Date(Date.now() + 60_000),
    });

    const response = await workerRegisterService.execute({
      data: buildRequestData(registrationToken.token),
    });

    expect(response.registration_token_id).toBe(registrationToken.id);
  });

  it("should reject a single-use registration token that was already used", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create({
      is_unlimited_usage: false,
    });
    await workerRegisterService.execute({
      data: buildRequestData(registrationToken.token),
    });

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(registrationToken.token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_register_service/REGISTRATION_TOKEN_ALREADY_USED",
      }),
    );
    expect(
      await workerRepository.getCount({
        registration_token_id: registrationToken.id,
      }),
    ).toBe(1);
  });

  it("should reject an expired registration token", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create({
      expires_at: new Date(Date.now() - 60_000),
    });

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(registrationToken.token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_register_service/REGISTRATION_TOKEN_EXPIRED",
      }),
    );
    expect(
      await workerRepository.getCount({
        registration_token_id: registrationToken.id,
      }),
    ).toBe(0);
  });

  it("should reject an archived registration token", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create({
      archived_at: new Date(),
    });

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(registrationToken.token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_register_service/REGISTRATION_TOKEN_NOT_FOUND",
      }),
    );
  });

  it("should reuse an unlimited registration token", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create({
      is_unlimited_usage: true,
    });

    const firstWorker = await workerRegisterService.execute({
      data: buildRequestData(registrationToken.token),
    });
    const secondWorker = await workerRegisterService.execute({
      data: buildRequestData(registrationToken.token),
    });

    expect(firstWorker.id).not.toBe(secondWorker.id);
    expect(
      await workerRepository.getCount({
        registration_token_id: registrationToken.id,
      }),
    ).toBe(2);
  });

  it("should register exactly one worker when a single-use token is used concurrently", async () => {
    const registrationToken = await workerRegistrationTokenFactory.create({
      is_unlimited_usage: false,
    });

    const results = await Promise.allSettled([
      workerRegisterService.execute({
        data: buildRequestData(registrationToken.token),
      }),
      workerRegisterService.execute({
        data: buildRequestData(registrationToken.token),
      }),
    ]);

    expect(results.map(result => result.status).sort()).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect(results.find(result => result.status === "rejected")).toEqual({
      status: "rejected",
      reason: expect.objectContaining({
        key: "@worker_register_service/REGISTRATION_TOKEN_ALREADY_USED",
      }),
    });
    expect(
      await workerRepository.getCount({
        registration_token_id: registrationToken.id,
      }),
    ).toBe(1);
  });
});

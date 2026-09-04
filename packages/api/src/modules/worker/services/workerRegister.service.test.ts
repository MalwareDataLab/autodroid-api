import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Repository import
import { IWorkerRepository } from "../repositories/IWorker.repository";
import { IWorkerRegistrationTokenRepository } from "../repositories/IWorkerRegistrationToken.repository";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "../entities/factories/workerRegistrationToken.factory";

// Schema import
import { WorkerRegisterSchema } from "../schemas/worker.schema";

// Service import
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
});

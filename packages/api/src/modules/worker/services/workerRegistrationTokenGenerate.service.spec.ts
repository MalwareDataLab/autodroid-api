import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Repository import
import { IWorkerRegistrationTokenRepository } from "@modules/worker/repositories/IWorkerRegistrationToken.repository";

// Factory import
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Service import
import { WorkerRegistrationTokenGenerateService } from "./workerRegistrationTokenGenerate.service";

describe("Service: WorkerRegistrationTokenGenerateService", () => {
  let workerRegistrationTokenRepositoryMock: Mocked<IWorkerRegistrationTokenRepository>;

  let workerRegistrationTokenGenerateService: WorkerRegistrationTokenGenerateService;

  beforeEach(() => {
    workerRegistrationTokenRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    workerRegistrationTokenGenerateService =
      new WorkerRegistrationTokenGenerateService(
        workerRegistrationTokenRepositoryMock,
      );
  });

  it("should generate a token that does not exist yet", async () => {
    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(null);

    const response = await workerRegistrationTokenGenerateService.execute();

    expect(response).toBeTypeOf("string");
    expect(response.length).toBeGreaterThan(0);
  });

  it("should retry when the generated token already exists", async () => {
    const existing = workerRegistrationTokenFactory.build();

    workerRegistrationTokenRepositoryMock.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null);

    const response = await workerRegistrationTokenGenerateService.execute();

    expect(response).toBeTypeOf("string");
    expect(workerRegistrationTokenRepositoryMock.findOne).toHaveBeenCalledTimes(
      2,
    );
  });

  it("should throw when the retries are exceeded", async () => {
    const existing = workerRegistrationTokenFactory.build();

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValue(existing);

    await expect(() =>
      workerRegistrationTokenGenerateService.execute(10),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_registration_token_generate_service/RETRIES_EXCEEDED",
      }),
    );
  });
});

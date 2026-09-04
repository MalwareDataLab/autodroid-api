import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Repository import
import { IWorkerRegistrationTokenRepository } from "../repositories/IWorkerRegistrationToken.repository";

// Factory import
import { workerRegistrationTokenFactory } from "../entities/factories/workerRegistrationToken.factory";

// Service import
import { WorkerRegistrationTokenGenerateService } from "./workerRegistrationTokenGenerate.service";

describe("Service: WorkerRegistrationTokenGenerateService", () => {
  let workerRegistrationTokenRepository: IWorkerRegistrationTokenRepository;

  let workerRegistrationTokenGenerateService: WorkerRegistrationTokenGenerateService;

  beforeEach(() => {
    workerRegistrationTokenRepository = container.resolve(
      "WorkerRegistrationTokenRepository",
    );

    workerRegistrationTokenGenerateService =
      new WorkerRegistrationTokenGenerateService(
        workerRegistrationTokenRepository,
      );
  });

  it("should generate a token that does not exist yet", async () => {
    const token = await workerRegistrationTokenGenerateService.execute();

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);

    const found = await workerRegistrationTokenRepository.findOne({ token });
    expect(found).toBeNull();
  });

  it("should retry when the generated token already exists", async () => {
    const existing = await workerRegistrationTokenFactory.create();

    const findOneSpy = vi
      .spyOn(workerRegistrationTokenRepository, "findOne")
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null);

    const token = await workerRegistrationTokenGenerateService.execute();

    expect(typeof token).toBe("string");
    expect(findOneSpy).toHaveBeenCalledTimes(2);
  });

  it("should throw when the retries are exceeded", async () => {
    const existing = await workerRegistrationTokenFactory.create();

    vi.spyOn(workerRegistrationTokenRepository, "findOne").mockResolvedValue(
      existing,
    );

    await expect(() =>
      workerRegistrationTokenGenerateService.execute(),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_registration_token_generate_service/RETRIES_EXCEEDED",
      }),
    );
  });
});

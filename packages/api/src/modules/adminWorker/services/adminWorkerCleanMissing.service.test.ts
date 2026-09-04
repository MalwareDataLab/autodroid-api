import { beforeEach, describe, expect, it } from "vitest";

// Config import
import { getAdminConfig } from "@config/admin";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Service import
import { AdminWorkerCleanMissingService } from "./adminWorkerCleanMissing.service";

describe("Service: AdminWorkerCleanMissingService", () => {
  let workerRepository: IWorkerRepository;
  let adminWorkerCleanMissingService: AdminWorkerCleanMissingService;

  beforeEach(context => {
    workerRepository = context.container.resolve("WorkerRepository");
    adminWorkerCleanMissingService = context.container.resolve(
      AdminWorkerCleanMissingService,
    );
  });

  it("should mark workers not seen in 7 days as missing", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const stale = await workerFactory.create({
      missing: false,
      last_seen_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    });
    const fresh = await workerFactory.create({
      missing: false,
      last_seen_at: new Date(),
    });

    const response = await adminWorkerCleanMissingService.execute({
      user: admin,
      language: "en",
    });

    expect(response).toBe(1);
    await expect(
      workerRepository.findOne({ id: stale.id }),
    ).resolves.toMatchObject({ missing: true });
    await expect(
      workerRepository.findOne({ id: fresh.id }),
    ).resolves.toMatchObject({ missing: false });
  });

  it("should return 0 when there is nothing to clean", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    const response = await adminWorkerCleanMissingService.execute({
      user: admin,
      language: "en",
    });

    expect(response).toBe(0);
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminWorkerCleanMissingService.execute({
        user,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});

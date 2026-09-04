import { beforeEach, describe, expect, it } from "vitest";

// Config import
import { getAdminConfig } from "@config/admin";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Service import
import { AdminProcessingCleanExpiredService } from "./adminProcessingCleanExpired.service";

describe("Service: AdminProcessingCleanExpiredService", () => {
  let processingRepository: IProcessingRepository;
  let adminProcessingCleanExpiredService: AdminProcessingCleanExpiredService;

  beforeEach(context => {
    processingRepository = context.container.resolve("ProcessingRepository");
    adminProcessingCleanExpiredService = context.container.resolve(
      AdminProcessingCleanExpiredService,
    );
  });

  it("should delete expired processes and keep non-expired ones", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const dataset = await datasetFactory.create();
    const processor = await processorFactory.create();

    const expired = await processingFactory.create(
      { keep_until: new Date(Date.now() - 60_000) },
      { associations: { dataset, processor } },
    );
    const notExpired = await processingFactory.create(
      { keep_until: new Date(Date.now() + 60_000) },
      { associations: { dataset, processor } },
    );

    const response = await adminProcessingCleanExpiredService.execute({
      user: admin,
      language: "en",
    });

    expect(response).toBe(1);
    await expect(
      processingRepository.findOne({ id: expired.id }),
    ).resolves.toBeNull();
    await expect(
      processingRepository.findOne({ id: notExpired.id }),
    ).resolves.toMatchObject({ id: notExpired.id });
  });

  it("should return 0 when there is nothing expired", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    const response = await adminProcessingCleanExpiredService.execute({
      user: admin,
      language: "en",
    });

    expect(response).toBe(0);
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminProcessingCleanExpiredService.execute({
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

import { beforeEach, describe, expect, it } from "vitest";

// Config import
import { getAdminConfig } from "@config/admin";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Schema import
import { AdminProcessingFailDanglingSchema } from "../schemas/adminProcessing.schema";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Service import
import { AdminProcessingFailDanglingService } from "./adminProcessingFailDangling.service";

describe("Service: AdminProcessingFailDanglingService", () => {
  let processingRepository: IProcessingRepository;
  let adminProcessingFailDanglingService: AdminProcessingFailDanglingService;

  beforeEach(context => {
    processingRepository = context.container.resolve("ProcessingRepository");
    adminProcessingFailDanglingService = context.container.resolve(
      AdminProcessingFailDanglingService,
    );
  });

  it("should fail dangling pending processes older than a day by default", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const dangling = await processingFactory.create({
      status: PROCESSING_STATUS.PENDING,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
    const recent = await processingFactory.create({
      status: PROCESSING_STATUS.PENDING,
      created_at: new Date(),
    });

    const response = await adminProcessingFailDanglingService.execute({
      user: admin,
      params: {} as AdminProcessingFailDanglingSchema,
      language: "en",
    });

    expect(response).toBe(1);
    await expect(
      processingRepository.findOne({ id: dangling.id }),
    ).resolves.toMatchObject({ status: PROCESSING_STATUS.FAILED });
    await expect(
      processingRepository.findOne({ id: recent.id }),
    ).resolves.toMatchObject({ status: PROCESSING_STATUS.PENDING });
  });

  it("should fail dangling processes matching an explicit status filter", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const dangling = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    const response = await adminProcessingFailDanglingService.execute({
      user: admin,
      params: {
        status: PROCESSING_STATUS.RUNNING,
      } as AdminProcessingFailDanglingSchema,
      language: "en",
    });

    expect(response).toBe(1);
    await expect(
      processingRepository.findOne({ id: dangling.id }),
    ).resolves.toMatchObject({ status: PROCESSING_STATUS.FAILED });
  });

  it("should return 0 when nothing is dangling", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    const response = await adminProcessingFailDanglingService.execute({
      user: admin,
      params: {} as AdminProcessingFailDanglingSchema,
      language: "en",
    });

    expect(response).toBe(0);
  });

  it("should throw if created_at_end_date is in the future", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    await expect(() =>
      adminProcessingFailDanglingService.execute({
        user: admin,
        params: {
          created_at_end_date: new Date(Date.now() + 60 * 60 * 1000),
        } as AdminProcessingFailDanglingSchema,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_fail_dangling_service/ERROR",
      }),
    );
  });

  it("should throw if the status filter is not PENDING or RUNNING", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    await expect(() =>
      adminProcessingFailDanglingService.execute({
        user: admin,
        params: {
          status: PROCESSING_STATUS.SUCCEEDED,
        } as AdminProcessingFailDanglingSchema,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_fail_dangling_service/ERROR",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminProcessingFailDanglingService.execute({
        user,
        params: {} as AdminProcessingFailDanglingSchema,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});

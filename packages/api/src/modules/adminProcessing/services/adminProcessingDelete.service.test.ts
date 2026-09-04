import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Config import
import { getAdminConfig } from "@config/admin";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Service import
import { AdminProcessingDeleteService } from "./adminProcessingDelete.service";

describe("Service: AdminProcessingDeleteService", () => {
  let processingRepository: IProcessingRepository;
  let adminProcessingDeleteService: AdminProcessingDeleteService;

  beforeEach(context => {
    processingRepository = context.container.resolve("ProcessingRepository");
    adminProcessingDeleteService = context.container.resolve(
      AdminProcessingDeleteService,
    );
  });

  it("should delete a processing removing its result and metrics files", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const resultFile = await fileFactory.create({
      type: FILE_TYPE.PROCESSING_RESULT,
      mime_type: MIME_TYPE.ZIP,
      storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      provider_status: FILE_PROVIDER_STATUS.READY,
    });
    const metricsFile = await fileFactory.create({
      type: FILE_TYPE.PROCESSING_METRICS,
      mime_type: MIME_TYPE.ZIP,
      storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      provider_status: FILE_PROVIDER_STATUS.READY,
    });
    const processing = await processingFactory.create({
      result_file_id: resultFile.id,
      metrics_file_id: metricsFile.id,
    });

    const response = await adminProcessingDeleteService.execute({
      processing_id: processing.id,
      user: admin,
      language: "en",
    });

    expect(response).toMatchObject({ id: processing.id });
    await expect(
      processingRepository.findOne({ id: processing.id }),
    ).resolves.toBeNull();
  });

  it("should delete a processing without result or metrics files", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const processing = await processingFactory.create();

    const response = await adminProcessingDeleteService.execute({
      processing_id: processing.id,
      user: admin,
      language: "en",
    });

    expect(response).toMatchObject({ id: processing.id });
  });

  it("should throw if the processing was not found", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    await expect(() =>
      adminProcessingDeleteService.execute({
        processing_id: faker.string.uuid(),
        user: admin,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processing_delete_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminProcessingDeleteService.execute({
        processing_id: faker.string.uuid(),
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

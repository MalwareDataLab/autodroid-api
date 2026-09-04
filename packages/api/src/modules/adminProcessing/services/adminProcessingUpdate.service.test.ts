import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Config import
import { getAdminConfig } from "@config/admin";

// Enum import
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Service import
import { AdminProcessingUpdateService } from "./adminProcessingUpdate.service";

describe("Service: AdminProcessingUpdateService", () => {
  let adminProcessingUpdateService: AdminProcessingUpdateService;

  beforeEach(context => {
    adminProcessingUpdateService = context.container.resolve(
      AdminProcessingUpdateService,
    );
  });

  it("should update a processing's visibility", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const processing = await processingFactory.create({
      visibility: PROCESSING_VISIBILITY.PRIVATE,
    });

    const response = await adminProcessingUpdateService.execute({
      processing_id: processing.id,
      data: { visibility: PROCESSING_VISIBILITY.PUBLIC },
      user: admin,
      language: "en",
    });

    expect(response).toMatchObject({
      id: processing.id,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    });
  });

  it("should throw if the processing was not found", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    await expect(() =>
      adminProcessingUpdateService.execute({
        processing_id: faker.string.uuid(),
        data: { visibility: PROCESSING_VISIBILITY.PUBLIC },
        user: admin,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processing_update_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminProcessingUpdateService.execute({
        processing_id: faker.string.uuid(),
        data: { visibility: PROCESSING_VISIBILITY.PUBLIC },
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

import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Config import
import { getAdminConfig } from "@config/admin";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Service import
import { AdminProcessingShowService } from "./adminProcessingShow.service";

describe("Service: AdminProcessingShowService", () => {
  let adminProcessingShowService: AdminProcessingShowService;

  beforeEach(context => {
    adminProcessingShowService = context.container.resolve(
      AdminProcessingShowService,
    );
  });

  it("should show a processing", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const processing = await processingFactory.create();

    const response = await adminProcessingShowService.execute({
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
      adminProcessingShowService.execute({
        processing_id: faker.string.uuid(),
        user: admin,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processing_show_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminProcessingShowService.execute({
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

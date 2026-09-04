import { beforeEach, describe, expect, it } from "vitest";

// Config import
import { getAdminConfig } from "@config/admin";

// Schema import
import { AdminProcessingIndexSchema } from "../schemas/adminProcessing.schema";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Service import
import { AdminProcessingIndexService } from "./adminProcessingIndex.service";

describe("Service: AdminProcessingIndexService", () => {
  let adminProcessingIndexService: AdminProcessingIndexService;

  beforeEach(context => {
    adminProcessingIndexService = context.container.resolve(
      AdminProcessingIndexService,
    );
  });

  it("should list processes", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const processing = await processingFactory.create();

    const response = await adminProcessingIndexService.execute({
      filter: {} as AdminProcessingIndexSchema,
      user: admin,
    });

    expect(response.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: processing.id }),
        }),
      ]),
    );
  });

  it("should return an empty page when there are no processes", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    const response = await adminProcessingIndexService.execute({
      filter: {} as AdminProcessingIndexSchema,
      user: admin,
    });

    expect(response.edges).toEqual([]);
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminProcessingIndexService.execute({
        filter: {} as AdminProcessingIndexSchema,
        user,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});

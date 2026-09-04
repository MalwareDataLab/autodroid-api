import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";

// Factory import
import { User } from "@modules/user/entities/user.entity";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Enum import
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Service import
import { AdminProcessorIndexService } from "./adminProcessorIndex.service";

describe("Service: AdminProcessorIndexService", () => {
  let adminUser: User;
  let adminProcessorIndexService: AdminProcessorIndexService;

  beforeEach(async () => {
    adminUser = await userFactory.create({ email: "luiz@laviola.dev" });
    adminProcessorIndexService = container.resolve(
      AdminProcessorIndexService,
    );
  });

  it("should list every processor regardless of visibility", async () => {
    const owner = await userFactory.create();
    const hiddenProcessor = await processorFactory.create({
      user_id: owner.id,
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
    });
    const publicProcessor = await processorFactory.create({
      user_id: owner.id,
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    const response = await adminProcessorIndexService.execute({
      user: adminUser,
      language: "en",
    });

    expect(response.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining(hiddenProcessor),
        }),
        expect.objectContaining({
          node: expect.objectContaining(publicProcessor),
        }),
      ]),
    );
  });

  it("should return an empty list when there are no processors", async () => {
    const response = await adminProcessorIndexService.execute({
      user: adminUser,
      language: "en",
    });

    expect(response.edges).toEqual([]);
  });

  it("should throw if the user is not an admin", async () => {
    const nonAdmin = await userFactory.create();

    expect(() =>
      adminProcessorIndexService.execute({
        user: nonAdmin,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});

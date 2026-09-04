import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Factory import
import { User } from "@modules/user/entities/user.entity";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Service import
import { AdminProcessorShowService } from "./adminProcessorShow.service";

describe("Service: AdminProcessorShowService", () => {
  let adminUser: User;
  let adminProcessorShowService: AdminProcessorShowService;

  beforeEach(async () => {
    adminUser = await userFactory.create({ email: "luiz@laviola.dev" });
    adminProcessorShowService = container.resolve(AdminProcessorShowService);
  });

  it("should show a processor", async () => {
    const owner = await userFactory.create();
    const processor = await processorFactory.create({ user_id: owner.id });

    const response = await adminProcessorShowService.execute({
      processor_id: processor.id,
      user: adminUser,
      language: "en",
    });

    expect(response).toMatchObject(processor);
  });

  it("should throw if the processor was not found", async () => {
    await expect(() =>
      adminProcessorShowService.execute({
        processor_id: faker.string.uuid(),
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processor_show_service/PROCESSOR_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const nonAdmin = await userFactory.create();

    expect(() =>
      adminProcessorShowService.execute({
        processor_id: faker.string.uuid(),
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

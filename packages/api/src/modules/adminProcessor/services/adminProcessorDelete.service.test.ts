import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Factory import
import { User } from "@modules/user/entities/user.entity";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Repository import
import { IProcessorRepository } from "@shared/container/repositories";

// Service import
import { AdminProcessorDeleteService } from "./adminProcessorDelete.service";

describe("Service: AdminProcessorDeleteService", () => {
  let adminUser: User;
  let processorRepository: IProcessorRepository;
  let adminProcessorDeleteService: AdminProcessorDeleteService;

  beforeEach(async () => {
    adminUser = await userFactory.create({ email: "luiz@laviola.dev" });
    processorRepository = container.resolve("ProcessorRepository");
    adminProcessorDeleteService = container.resolve(
      AdminProcessorDeleteService,
    );
  });

  it("should delete a processor", async () => {
    const owner = await userFactory.create();
    const processor = await processorFactory.create({ user_id: owner.id });

    const response = await adminProcessorDeleteService.execute({
      processor_id: processor.id,
      user: adminUser,
      language: "en",
    });

    expect(response).toMatchObject({ id: processor.id });
    await expect(
      processorRepository.findOne({ id: processor.id }),
    ).resolves.toBeNull();
  });

  it("should throw if the processor is in use", async () => {
    const owner = await userFactory.create();
    const processor = await processorFactory.create({ user_id: owner.id });
    await processingFactory.create({
      processor_id: processor.id,
      user_id: owner.id,
    });

    await expect(() =>
      adminProcessorDeleteService.execute({
        processor_id: processor.id,
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processor_delete_service/PROCESSOR_IN_USE",
      }),
    );
  });

  it("should throw if the processor was not found", async () => {
    await expect(() =>
      adminProcessorDeleteService.execute({
        processor_id: faker.string.uuid(),
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processor_delete_service/PROCESSOR_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const nonAdmin = await userFactory.create();

    expect(() =>
      adminProcessorDeleteService.execute({
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

import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Factory import
import { User } from "@modules/user/entities/user.entity";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Enum import
import { PROCESSOR_PARAMETER_TYPE } from "@modules/processor/types/processorParameterType.enum";

// Schema import
import { ProcessorSchema } from "@modules/processor/schemas/processor.schema";

// Service import
import { AdminProcessorUpdateService } from "./adminProcessorUpdate.service";

describe("Service: AdminProcessorUpdateService", () => {
  let adminUser: User;
  let adminProcessorUpdateService: AdminProcessorUpdateService;

  beforeEach(async () => {
    adminUser = await userFactory.create({ email: "luiz@laviola.dev" });
    adminProcessorUpdateService = container.resolve(
      AdminProcessorUpdateService,
    );
  });

  it("should update a processor", async () => {
    const owner = await userFactory.create();
    const processor = await processorFactory.create({ user_id: owner.id });
    // ProcessorSchema excludes ownership/relation fields (see processor.schema.ts) —
    // strip them from the built entity so the real Prisma update() isn't handed a
    // stray user_id pointing at a non-persisted user.
    const {
      id: _id,
      seq: _seq,
      user_id: _userId,
      created_at: _createdAt,
      updated_at: _updatedAt,
      payload: _payload,
      ...data
    } = processorFactory.build({
      image_tag: faker.string.alphanumeric(12),
    });

    const response = await adminProcessorUpdateService.execute({
      processor_id: processor.id,
      data: data as unknown as ProcessorSchema,
      user: adminUser,
      language: "en",
    });

    expect(response).toMatchObject({
      id: processor.id,
      image_tag: data.image_tag,
    });
  });

  it("should throw if a configuration parameter type is invalid", async () => {
    const owner = await userFactory.create();
    const processor = await processorFactory.create({ user_id: owner.id });
    const data = processorFactory.build();
    data.configuration.parameters = [
      {
        sequence: 1,
        name: faker.word.sample(),
        description: faker.word.words(3),
        type: "INVALID" as unknown as PROCESSOR_PARAMETER_TYPE,
        is_required: false,
        default_value: null,
      },
    ];

    await expect(() =>
      adminProcessorUpdateService.execute({
        processor_id: processor.id,
        data: data as unknown as ProcessorSchema,
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/INVALID_PARAMETER_TYPE",
      }),
    );
  });

  it("should throw if the processor was not found", async () => {
    const data = processorFactory.build();

    await expect(() =>
      adminProcessorUpdateService.execute({
        processor_id: faker.string.uuid(),
        data: data as unknown as ProcessorSchema,
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processor_update_service/PROCESSOR_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const nonAdmin = await userFactory.create();
    const data = processorFactory.build();

    expect(() =>
      adminProcessorUpdateService.execute({
        processor_id: faker.string.uuid(),
        data: data as unknown as ProcessorSchema,
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

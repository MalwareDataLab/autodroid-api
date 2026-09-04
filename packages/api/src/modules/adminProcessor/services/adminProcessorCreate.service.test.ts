import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Factory import
import { User } from "@modules/user/entities/user.entity";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Repository import
import { IProcessorRepository } from "@shared/container/repositories";

// Enum import
import { PROCESSOR_PARAMETER_TYPE } from "@modules/processor/types/processorParameterType.enum";

// Schema import
import { ProcessorSchema } from "@modules/processor/schemas/processor.schema";

// Service import
import { AdminProcessorCreateService } from "./adminProcessorCreate.service";

describe("Service: AdminProcessorCreateService", () => {
  let adminUser: User;
  let processorRepository: IProcessorRepository;
  let adminProcessorCreateService: AdminProcessorCreateService;

  beforeEach(async () => {
    adminUser = await userFactory.create({ email: "luiz@laviola.dev" });
    processorRepository = container.resolve("ProcessorRepository");
    adminProcessorCreateService = container.resolve(
      AdminProcessorCreateService,
    );
  });

  it("should create a processor", async () => {
    const data = processorFactory.build({
      image_tag: faker.string.alphanumeric(12),
    });

    const response = await adminProcessorCreateService.execute({
      data: data as unknown as ProcessorSchema,
      user: adminUser,
      language: "en",
    });

    expect(response).toMatchObject({ image_tag: data.image_tag });
    await expect(
      processorRepository.findOne({ id: response.id }),
    ).resolves.toMatchObject({ image_tag: data.image_tag });
  });

  it("should throw if the processor already exists", async () => {
    const owner = await userFactory.create();
    const existing = await processorFactory.create({ user_id: owner.id });
    const data = processorFactory.build({ image_tag: existing.image_tag });

    await expect(() =>
      adminProcessorCreateService.execute({
        data: data as unknown as ProcessorSchema,
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processor_create_service/PROCESSOR_ALREADY_EXISTS",
      }),
    );
  });

  it("should throw if the allowed mime types are invalid", async () => {
    const data = processorFactory.build({
      image_tag: faker.string.alphanumeric(12),
      allowed_mime_types: "invalid",
    });

    await expect(() =>
      adminProcessorCreateService.execute({
        data: data as unknown as ProcessorSchema,
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@parse_and_validate_processor_allowed_mime_types/INVALID_MIME_TYPES",
      }),
    );
  });

  it("should throw if a configuration parameter type is invalid", async () => {
    const data = processorFactory.build({
      image_tag: faker.string.alphanumeric(12),
    });
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
      adminProcessorCreateService.execute({
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

  it("should throw if the user is not an admin", async () => {
    const nonAdmin = await userFactory.create();
    const data = processorFactory.build();

    expect(() =>
      adminProcessorCreateService.execute({
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

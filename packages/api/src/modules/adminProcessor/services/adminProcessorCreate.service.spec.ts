import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Repository import
import { IProcessorRepository } from "@modules/processor/repositories/IProcessor.repository";

// Enum import
import { PROCESSOR_PARAMETER_TYPE } from "@modules/processor/types/processorParameterType.enum";

// Schema import
import { ProcessorSchema } from "@modules/processor/schemas/processor.schema";

// Service import
import { AdminProcessorCreateService } from "./adminProcessorCreate.service";

describe("Service: AdminProcessorCreateService", () => {
  let processorRepositoryMock: Mocked<IProcessorRepository>;

  let adminProcessorCreateService: AdminProcessorCreateService;

  beforeEach(() => {
    processorRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getAllowedMimeTypes: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    adminProcessorCreateService = new AdminProcessorCreateService(
      processorRepositoryMock,
    );
  });

  it("should create a processor", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processor = processorFactory.build();

    processorRepositoryMock.findOne.mockResolvedValueOnce(null);
    processorRepositoryMock.createOne.mockResolvedValueOnce(processor);

    const response = await adminProcessorCreateService.execute({
      data: processor as unknown as ProcessorSchema,
      user,
      language: "en",
    });

    expect(response).toMatchObject(processor);
  });

  it("should throw if the processor already exists", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processor = processorFactory.build();

    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);

    await expect(() =>
      adminProcessorCreateService.execute({
        data: processor as unknown as ProcessorSchema,
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processor_create_service/PROCESSOR_ALREADY_EXISTS",
      }),
    );
  });

  it("should throw if the allowed mime types are invalid", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processor = processorFactory.build({
      allowed_mime_types: "invalid",
    });

    processorRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminProcessorCreateService.execute({
        data: processor as unknown as ProcessorSchema,
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@parse_and_validate_processor_allowed_mime_types/INVALID_MIME_TYPES",
      }),
    );
  });

  it("should throw if a configuration parameter type is invalid", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processor = processorFactory.build();

    processor.configuration.parameters = [
      {
        sequence: 1,
        name: faker.word.sample(),
        description: faker.word.words(3),
        type: "INVALID" as unknown as PROCESSOR_PARAMETER_TYPE,
        is_required: false,
        default_value: null,
      },
    ];

    processorRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminProcessorCreateService.execute({
        data: processor as unknown as ProcessorSchema,
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/INVALID_PARAMETER_TYPE",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();
    const processor = processorFactory.build();

    expect(() =>
      adminProcessorCreateService.execute({
        data: processor as unknown as ProcessorSchema,
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

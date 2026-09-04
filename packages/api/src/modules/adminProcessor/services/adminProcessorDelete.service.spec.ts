import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Repository import
import {
  IProcessingRepository,
  IProcessorRepository,
} from "@shared/container/repositories";

// Service import
import { AdminProcessorDeleteService } from "./adminProcessorDelete.service";

describe("Service: AdminProcessorDeleteService", () => {
  let processorRepositoryMock: Mocked<IProcessorRepository>;
  let processingRepositoryMock: Mocked<IProcessingRepository>;

  let adminProcessorDeleteService: AdminProcessorDeleteService;

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

    processingRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
      getOneEstimatedExecutionTime: vi.fn(),
      getManyEstimatedExecutionTimes: vi.fn(),
    };

    adminProcessorDeleteService = new AdminProcessorDeleteService(
      processorRepositoryMock,
      processingRepositoryMock,
    );
  });

  it("should delete a processor", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processor = processorFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(null);
    processorRepositoryMock.deleteOne.mockResolvedValueOnce(processor);

    const response = await adminProcessorDeleteService.execute({
      processor_id: processor.id,
      user,
      language: "en",
    });

    expect(response).toMatchObject(processor);
  });

  it("should throw if the processor is in use", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processing = processingFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await expect(() =>
      adminProcessorDeleteService.execute({
        processor_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processor_delete_service/PROCESSOR_IN_USE",
      }),
    );
  });

  it("should throw if the processor was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    processingRepositoryMock.findOne.mockResolvedValueOnce(null);
    processorRepositoryMock.deleteOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminProcessorDeleteService.execute({
        processor_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processor_delete_service/PROCESSOR_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminProcessorDeleteService.execute({
        processor_id: faker.string.uuid(),
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

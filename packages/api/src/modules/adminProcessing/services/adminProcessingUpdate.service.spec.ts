import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Schema import
import { AdminProcessingUpdateSchema } from "../schemas/adminProcessing.schema";

// Service import
import { AdminProcessingUpdateService } from "./adminProcessingUpdate.service";

describe("Service: AdminProcessingUpdateService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;

  let adminProcessingUpdateService: AdminProcessingUpdateService;

  beforeEach(() => {
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

    adminProcessingUpdateService = new AdminProcessingUpdateService(
      processingRepositoryMock,
    );
  });

  it("should update a processing", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processing = processingFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(processing);

    const response = await adminProcessingUpdateService.execute({
      processing_id: processing.id,
      data: {} as AdminProcessingUpdateSchema,
      user,
      language: "en",
    });

    expect(response).toMatchObject(processing);
  });

  it("should throw if the processing was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminProcessingUpdateService.execute({
        processing_id: faker.string.uuid(),
        data: {} as AdminProcessingUpdateSchema,
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processing_update_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if the processing was not updated", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processing = processingFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(
      null as unknown as never,
    );

    await expect(() =>
      adminProcessingUpdateService.execute({
        processing_id: processing.id,
        data: {} as AdminProcessingUpdateSchema,
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processing_update_service/PROCESSING_NOT_UPDATED",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminProcessingUpdateService.execute({
        processing_id: faker.string.uuid(),
        data: {} as AdminProcessingUpdateSchema,
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

import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Service import
import { AdminProcessingShowService } from "./adminProcessingShow.service";

describe("Service: AdminProcessingShowService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;

  let adminProcessingShowService: AdminProcessingShowService;

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

    adminProcessingShowService = new AdminProcessingShowService(
      processingRepositoryMock,
    );
  });

  it("should show a processing", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processing = processingFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    const response = await adminProcessingShowService.execute({
      processing_id: processing.id,
      user,
      language: "en",
    });

    expect(response).toMatchObject(processing);
  });

  it("should throw if the processing was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminProcessingShowService.execute({
        processing_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processing_show_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

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

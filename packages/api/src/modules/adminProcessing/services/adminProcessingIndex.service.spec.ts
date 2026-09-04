import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Schema import
import { AdminProcessingIndexSchema } from "../schemas/adminProcessing.schema";

// Service import
import { AdminProcessingIndexService } from "./adminProcessingIndex.service";

describe("Service: AdminProcessingIndexService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;

  let adminProcessingIndexService: AdminProcessingIndexService;

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

    adminProcessingIndexService = new AdminProcessingIndexService(
      processingRepositoryMock,
    );
  });

  it("should list processes", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processing = processingFactory.build();

    processingRepositoryMock.getCount.mockResolvedValueOnce(1);
    processingRepositoryMock.findMany.mockResolvedValueOnce([processing]);

    const response = await adminProcessingIndexService.execute({
      filter: {} as AdminProcessingIndexSchema,
      user,
    });

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining(processing),
          }),
        ]),
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

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

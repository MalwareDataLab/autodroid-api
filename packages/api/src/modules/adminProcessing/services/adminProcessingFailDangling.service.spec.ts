import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Schema import
import { AdminProcessingFailDanglingSchema } from "../schemas/adminProcessing.schema";

// Service import
import { AdminProcessingFailDanglingService } from "./adminProcessingFailDangling.service";

describe("Service: AdminProcessingFailDanglingService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let jobProviderMock: Mocked<IJobProvider>;

  let adminProcessingFailDanglingService: AdminProcessingFailDanglingService;

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

    jobProviderMock = {
      initialization: Promise.resolve(),
      add: vi.fn(),
      close: vi.fn(),
    } as unknown as Mocked<IJobProvider>;

    adminProcessingFailDanglingService = new AdminProcessingFailDanglingService(
      processingRepositoryMock,
      jobProviderMock,
    );
  });

  it("should fail dangling processes", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    processingRepositoryMock.findMany.mockResolvedValueOnce([]);

    const response = await adminProcessingFailDanglingService.execute({
      user,
      params: {} as AdminProcessingFailDanglingSchema,
      language: "en",
    });

    expect(response).toBe(0);
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminProcessingFailDanglingService.execute({
        user,
        params: {} as AdminProcessingFailDanglingSchema,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});

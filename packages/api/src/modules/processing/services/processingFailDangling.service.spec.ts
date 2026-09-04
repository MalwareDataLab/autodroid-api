import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Enum import
import { PROCESSING_STATUS } from "../types/processingStatus.enum";

// Repository import
import { IProcessingRepository } from "../repositories/IProcessing.repository";

// Factory import
import { processingFactory } from "../entities/factories/processing.factory";

// Service import
import { ProcessingFailDanglingService } from "./processingFailDangling.service";

describe("Service: ProcessingFailDanglingService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let jobProviderMock: Mocked<IJobProvider>;

  let processingFailDanglingService: ProcessingFailDanglingService;

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
    };

    processingFailDanglingService = new ProcessingFailDanglingService(
      processingRepositoryMock,
      jobProviderMock,
    );
  });

  it("should throw when created_at_end_date is in the future", async () => {
    await expect(() =>
      processingFailDanglingService.execute({
        created_at_end_date: DateUtils.now().add(1, "day").toDate(),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_fail_dangling_service/ERROR",
      }),
    );
  });

  it("should throw when status is not PENDING or RUNNING", async () => {
    await expect(() =>
      processingFailDanglingService.execute({
        status: PROCESSING_STATUS.SUCCEEDED,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_fail_dangling_service/ERROR",
      }),
    );
  });

  it("should fail dangling processes using provided arguments", async () => {
    const processingA = processingFactory.build();
    const processingB = processingFactory.build();

    processingRepositoryMock.findMany.mockResolvedValueOnce([
      processingA,
      processingB,
    ]);
    processingRepositoryMock.updateOne.mockResolvedValue(processingA);
    processingRepositoryMock.findOne.mockResolvedValue(null);

    const response = await processingFailDanglingService.execute({
      created_at_end_date: DateUtils.now().subtract(1, "day").toDate(),
      status: PROCESSING_STATUS.RUNNING,
    });

    expect(response).toBe(2);
    expect(processingRepositoryMock.updateOne).toHaveBeenCalledTimes(2);
  });

  it("should use defaults and skip processes that fail to update", async () => {
    const processing = processingFactory.build();

    processingRepositoryMock.findMany.mockResolvedValueOnce([processing]);
    processingRepositoryMock.updateOne.mockRejectedValueOnce(new Error());

    const response = await processingFailDanglingService.execute({});

    expect(response).toBe(0);
  });
});

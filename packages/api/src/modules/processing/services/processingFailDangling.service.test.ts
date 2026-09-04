import { beforeEach, describe, it, expect } from "vitest";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Repository import
import { IProcessingRepository } from "../repositories/IProcessing.repository";

// Enum import
import { PROCESSING_STATUS } from "../types/processingStatus.enum";

// Factory import
import { processingFactory } from "../entities/factories/processing.factory";

// Target import
import { ProcessingFailDanglingService } from "./processingFailDangling.service";

describe("Service: ProcessingFailDanglingService", () => {
  let processingFailDanglingService: ProcessingFailDanglingService;
  let processingRepository: IProcessingRepository;

  beforeEach(context => {
    context.container.registerInstance<IJobProvider>("JobProvider", {
      initialization: Promise.resolve(),
      add: () => undefined,
      close: async () => undefined,
    });

    processingFailDanglingService = context.container.resolve(
      ProcessingFailDanglingService,
    );
    processingRepository = context.container.resolve("ProcessingRepository");
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
    const processingA = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      created_at: DateUtils.now().subtract(2, "day").toDate(),
    });
    const processingB = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      created_at: DateUtils.now().subtract(2, "day").toDate(),
    });
    await processingFactory.create({
      status: PROCESSING_STATUS.SUCCEEDED,
      created_at: DateUtils.now().subtract(2, "day").toDate(),
    });

    const response = await processingFailDanglingService.execute({
      created_at_end_date: DateUtils.now().subtract(1, "day").toDate(),
      status: PROCESSING_STATUS.RUNNING,
    });

    expect(response).toBe(2);

    const updatedA = await processingRepository.findOne({
      id: processingA.id,
    });
    const updatedB = await processingRepository.findOne({
      id: processingB.id,
    });
    expect(updatedA?.status).toBe(PROCESSING_STATUS.FAILED);
    expect(updatedB?.status).toBe(PROCESSING_STATUS.FAILED);
  });

  it("should use defaults (PENDING, 1 day) and skip processes outside the window", async () => {
    const dangling = await processingFactory.create({
      status: PROCESSING_STATUS.PENDING,
      created_at: DateUtils.now().subtract(2, "day").toDate(),
    });
    const recent = await processingFactory.create({
      status: PROCESSING_STATUS.PENDING,
      created_at: DateUtils.now().toDate(),
    });

    const response = await processingFailDanglingService.execute({});

    expect(response).toBe(1);

    const updatedDangling = await processingRepository.findOne({
      id: dangling.id,
    });
    const updatedRecent = await processingRepository.findOne({
      id: recent.id,
    });
    expect(updatedDangling?.status).toBe(PROCESSING_STATUS.FAILED);
    expect(updatedRecent?.status).toBe(PROCESSING_STATUS.PENDING);
  });

  it("should return 0 when there is nothing dangling", async () => {
    const response = await processingFailDanglingService.execute({
      created_at_end_date: DateUtils.now().subtract(1, "day").toDate(),
    });

    expect(response).toBe(0);
  });
});

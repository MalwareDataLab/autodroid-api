import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Repository import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { IProcessingRepository } from "../repositories/IProcessing.repository";

// Factory import
import { processingFactory } from "../entities/factories/processing.factory";

// Service import
import { ProcessingReportStatusService } from "./processingReportStatus.service";

describe("Service: ProcessingReportStatusService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let jobProviderMock: Mocked<IJobProvider>;

  let processingReportStatusService: ProcessingReportStatusService;

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

    processingReportStatusService = new ProcessingReportStatusService(
      processingRepositoryMock,
      jobProviderMock,
    );
  });

  it("should throw if the processing was not found", async () => {
    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      processingReportStatusService.execute({
        processing_id: faker.string.uuid(),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_report_status_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should return without sending notification when already reported", async () => {
    const user = userFactory.build({ notifications_enabled: true });
    const processing = processingFactory.build(
      { reported_at: new Date() },
      { associations: { user } },
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await processingReportStatusService.execute({
      processing_id: processing.id,
    });

    expect(jobProviderMock.add).not.toHaveBeenCalled();
  });

  it("should return without sending notification when notifications are disabled", async () => {
    const user = userFactory.build({ notifications_enabled: false });
    const processing = processingFactory.build(
      { reported_at: null },
      { associations: { user } },
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await processingReportStatusService.execute({
      processing_id: processing.id,
    });

    expect(jobProviderMock.add).not.toHaveBeenCalled();
  });

  it("should send a success notification when the processing succeeded", async () => {
    const user = userFactory.build({
      notifications_enabled: true,
      language: "en",
    });
    const processing = processingFactory.build(
      { reported_at: null, status: PROCESSING_STATUS.SUCCEEDED },
      { associations: { user } },
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await processingReportStatusService.execute({
      processing_id: processing.id,
    });

    expect(jobProviderMock.add).toHaveBeenCalledWith(
      "SendEmailNotificationJob",
      expect.objectContaining({
        to: [{ email: user.email, name: user.name }],
      }),
    );
  });

  it("should send a failure notification when the processing did not succeed", async () => {
    const user = userFactory.build({
      notifications_enabled: true,
      language: null as unknown as string,
    });
    const processing = processingFactory.build(
      { reported_at: null, status: PROCESSING_STATUS.FAILED },
      { associations: { user } },
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await processingReportStatusService.execute({
      processing_id: processing.id,
    });

    expect(jobProviderMock.add).toHaveBeenCalledWith(
      "SendEmailNotificationJob",
      expect.objectContaining({
        template: expect.objectContaining({ type: "processingResult" }),
      }),
    );
  });
});

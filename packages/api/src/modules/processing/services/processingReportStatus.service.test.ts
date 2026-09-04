import { beforeEach, describe, it, expect, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "../entities/factories/processing.factory";

// Target import
import { ProcessingReportStatusService } from "./processingReportStatus.service";

describe("Service: ProcessingReportStatusService", () => {
  let processingReportStatusService: ProcessingReportStatusService;
  let jobProviderAdd: ReturnType<typeof vi.fn>;

  beforeEach(context => {
    jobProviderAdd = vi.fn();
    context.container.registerInstance<IJobProvider>("JobProvider", {
      initialization: Promise.resolve(),
      add: jobProviderAdd,
      close: async () => undefined,
    });

    processingReportStatusService = context.container.resolve(
      ProcessingReportStatusService,
    );
  });

  it("should throw when the processing was not found", async () => {
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

  it("should return without sending a notification when already reported", async () => {
    const user = await userFactory.create({ notifications_enabled: true });
    const processing = await processingFactory.create(
      {
        status: PROCESSING_STATUS.SUCCEEDED,
        reported_at: faker.date.recent(),
      },
      { associations: { user } },
    );

    await processingReportStatusService.execute({
      processing_id: processing.id,
    });

    expect(jobProviderAdd).not.toHaveBeenCalled();
  });

  it("should return without sending a notification when notifications are disabled", async () => {
    const user = await userFactory.create({ notifications_enabled: false });
    const processing = await processingFactory.create(
      {
        status: PROCESSING_STATUS.SUCCEEDED,
        reported_at: null,
      },
      { associations: { user } },
    );

    await processingReportStatusService.execute({
      processing_id: processing.id,
    });

    expect(jobProviderAdd).not.toHaveBeenCalled();
  });

  it("should send a success notification when the processing succeeded", async () => {
    const user = await userFactory.create({
      notifications_enabled: true,
      language: "en",
    });
    const processing = await processingFactory.create(
      {
        status: PROCESSING_STATUS.SUCCEEDED,
        reported_at: null,
      },
      { associations: { user } },
    );

    await processingReportStatusService.execute({
      processing_id: processing.id,
    });

    expect(jobProviderAdd).toHaveBeenCalledWith(
      "SendEmailNotificationJob",
      expect.objectContaining({
        to: [{ email: user.email, name: user.name }],
        template: expect.objectContaining({
          type: "processingResult",
          variables: expect.objectContaining({
            processing_id: processing.id,
          }),
        }),
      }),
    );
  });

  it("should send a failure notification when the processing did not succeed", async () => {
    const user = await userFactory.create({
      notifications_enabled: true,
      language: "en",
    });
    const processing = await processingFactory.create(
      {
        status: PROCESSING_STATUS.FAILED,
        reported_at: null,
      },
      { associations: { user } },
    );

    await processingReportStatusService.execute({
      processing_id: processing.id,
    });

    expect(jobProviderAdd).toHaveBeenCalledOnce();
    const [, payload] = jobProviderAdd.mock.calls[0];
    expect(payload.subject).not.toMatch(/sucesso|success/i);
  });
});

import { beforeEach, describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Enum import
import { PROCESSING_STATUS } from "../types/processingStatus.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "../entities/factories/processing.factory";

// Target import
import { ProcessingHandleFailureService } from "./processingHandleFailure.service";

describe("Service: ProcessingHandleFailureService", () => {
  let processingHandleFailureService: ProcessingHandleFailureService;

  beforeEach(context => {
    context.container.registerInstance<IJobProvider>("JobProvider", {
      initialization: Promise.resolve(),
      add: () => undefined,
      close: async () => undefined,
    });

    processingHandleFailureService = context.container.resolve(
      ProcessingHandleFailureService,
    );
  });

  it("should fail only the not started processes", async () => {
    const user = await userFactory.create({ notifications_enabled: false });

    const notStartedProcessing = await processingFactory.create(
      { started_at: null, status: PROCESSING_STATUS.PENDING },
      { associations: { user } },
    );
    const startedProcessing = await processingFactory.create({
      started_at: new Date(),
      status: PROCESSING_STATUS.RUNNING,
    });
    const missingProcessingId = faker.string.uuid();

    const message = faker.lorem.sentence();

    const response = await processingHandleFailureService.execute({
      processing_ids: [
        notStartedProcessing.id,
        startedProcessing.id,
        missingProcessingId,
      ],
      message,
    });

    expect(response).toHaveLength(1);
    expect(response[0].id).toBe(notStartedProcessing.id);
    expect(response[0].status).toBe(PROCESSING_STATUS.FAILED);
    expect(response[0].message).toBe(message);
    expect(response[0].finished_at).not.toBeNull();
  });

  it("should return an empty list when no process id matches", async () => {
    const response = await processingHandleFailureService.execute({
      processing_ids: [faker.string.uuid()],
      message: faker.lorem.sentence(),
    });

    expect(response).toHaveLength(0);
  });
});

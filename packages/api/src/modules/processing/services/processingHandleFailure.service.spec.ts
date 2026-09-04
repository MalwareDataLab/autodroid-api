import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "../entities/factories/processing.factory";

// Service import
import { ProcessingHandleFailureService } from "./processingHandleFailure.service";

describe("Service: ProcessingHandleFailureService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let jobProviderMock: Mocked<IJobProvider>;

  let processingHandleFailureService: ProcessingHandleFailureService;

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

    processingHandleFailureService = new ProcessingHandleFailureService(
      processingRepositoryMock,
      jobProviderMock,
    );
  });

  it("should fail only the not started processes", async () => {
    const user = userFactory.build({ notifications_enabled: true });

    const notStartedProcessing = processingFactory.build(
      { started_at: null, reported_at: new Date() },
      { associations: { user } },
    );
    const startedProcessing = processingFactory.build({
      started_at: new Date(),
    });
    const missingProcessingId = faker.string.uuid();

    processingRepositoryMock.findOne.mockImplementation(async filter => {
      if (filter.id === notStartedProcessing.id) return notStartedProcessing;
      if (filter.id === startedProcessing.id) return startedProcessing;
      return null;
    });
    processingRepositoryMock.updateOne.mockResolvedValue(notStartedProcessing);

    const response = await processingHandleFailureService.execute({
      processing_ids: [
        notStartedProcessing.id,
        startedProcessing.id,
        missingProcessingId,
      ],
      message: faker.lorem.sentence(),
    });

    expect(response).toHaveLength(1);
    expect(response[0].id).toBe(notStartedProcessing.id);
    expect(processingRepositoryMock.updateOne).toHaveBeenCalledTimes(1);
  });
});

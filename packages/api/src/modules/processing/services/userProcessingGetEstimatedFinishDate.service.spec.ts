import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mock, MockProxy } from "vitest-mock-extended";

// Config import
import { getProcessingConfig } from "@config/processing";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Repository import
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Target import
import { UserProcessingGetEstimatedFinishDateService } from "./userProcessingGetEstimatedFinishDate.service";

describe("Service: UserProcessingGetEstimatedFinishDateService", () => {
  const user = userFactory.build();
  const dataset = datasetFactory.build({
    visibility: DATASET_VISIBILITY.PUBLIC,
  });
  const processor = processorFactory.build({
    visibility: PROCESSOR_VISIBILITY.PUBLIC,
  });

  const makeProcessing = (overrides: Record<string, unknown> = {}) =>
    processingFactory.build({
      user_id: user.id,
      dataset_id: dataset.id,
      processor_id: processor.id,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
      ...overrides,
    });

  let processingRepository: MockProxy<IProcessingRepository>;
  let datasetRepository: MockProxy<IDatasetRepository>;
  let processorRepository: MockProxy<IProcessorRepository>;

  let service: UserProcessingGetEstimatedFinishDateService;

  const estimation = (seconds: number) => ({
    dataset_id: dataset.id,
    processor_id: processor.id,
    average_execution_time_seconds: seconds,
  });

  const request = (processing_id: string) => ({
    user,
    processing_id,
    language: "en",
  });

  beforeEach(() => {
    processingRepository = mock<IProcessingRepository>();
    datasetRepository = mock<IDatasetRepository>();
    processorRepository = mock<IProcessorRepository>();

    datasetRepository.findOne.mockResolvedValue(dataset);
    processorRepository.findOne.mockResolvedValue(processor);

    service = new UserProcessingGetEstimatedFinishDateService(
      processingRepository,
      datasetRepository,
      processorRepository,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the recorded window for a finished processing", async () => {
    const started_at = new Date("2024-03-01T00:00:00.000Z");
    const finished_at = new Date("2024-03-01T01:00:00.000Z");
    const processing = makeProcessing({ started_at, finished_at });
    processingRepository.findOne.mockResolvedValueOnce(processing);

    const result = await service.execute(request(processing.id));

    expect(result).toEqual(
      expect.objectContaining({
        processing_id: processing.id,
        estimated_start_time: started_at,
        estimated_finish_time: finished_at,
      }),
    );
    expect(
      processingRepository.getManyEstimatedExecutionTimes,
    ).not.toHaveBeenCalled();
  });

  it("should return a null window when the pair has no recorded history", async () => {
    const processing = makeProcessing({ started_at: null, finished_at: null });
    processingRepository.findOne.mockResolvedValueOnce(processing);
    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce(
      [],
    );

    const result = await service.execute(request(processing.id));

    expect(result).toEqual(
      expect.objectContaining({
        estimated_start_time: null,
        estimated_finish_time: null,
      }),
    );
    expect(processingRepository.findMany).not.toHaveBeenCalled();
  });

  it("should project the start time forward for a queued processing", async () => {
    const { ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS } =
      getProcessingConfig();
    const now = new Date("2024-03-01T00:00:00.000Z");
    const processing = makeProcessing({ started_at: null, finished_at: null });

    processingRepository.findOne.mockResolvedValueOnce(processing);
    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      estimation(60),
    ]);
    processingRepository.findMany.mockResolvedValueOnce([]);

    vi.useFakeTimers({ now });

    const result = await service.execute(request(processing.id));

    expect(result.estimated_start_time).toEqual(
      new Date(
        now.getTime() +
          ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS * 1000,
      ),
    );
    expect(processingRepository.findMany).toHaveBeenCalledWith({
      finished: false,
    });
  });

  it("should keep the real start time for a running processing", async () => {
    const now = new Date("2024-03-01T00:00:00.000Z");
    const started_at = new Date("2024-02-29T23:59:00.000Z");
    const processing = makeProcessing({ started_at, finished_at: null });

    processingRepository.findOne.mockResolvedValueOnce(processing);
    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      estimation(60),
    ]);
    processingRepository.findMany.mockResolvedValueOnce([]);

    vi.useFakeTimers({ now });

    const result = await service.execute(request(processing.id));

    expect(result.estimated_start_time).toEqual(started_at);
    expect(result.estimated_finish_time).toBeInstanceOf(Date);
  });

  it("should add the queue backlog to a running processing estimate", async () => {
    const now = new Date("2024-03-01T00:00:00.000Z");
    const started_at = new Date("2024-02-29T23:59:00.000Z");
    const processing = makeProcessing({ started_at, finished_at: null });

    processingRepository.findOne.mockResolvedValueOnce(processing);
    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      estimation(60),
    ]);
    processingRepository.findMany.mockResolvedValueOnce([
      makeProcessing({ started_at: null, finished_at: null }),
    ]);

    vi.useFakeTimers({ now });

    const result = await service.execute(request(processing.id));

    const withoutBacklog = new Date(started_at.getTime());
    expect(result.estimated_finish_time!.getTime()).toBeGreaterThan(
      withoutBacklog.getTime(),
    );
  });

  it("should count only the remaining seconds of an already running backlog process", async () => {
    const now = new Date("2024-03-01T00:00:00.000Z");
    const started_at = new Date("2024-02-29T23:59:00.000Z");
    const processing = makeProcessing({ started_at, finished_at: null });

    processingRepository.findOne.mockResolvedValueOnce(processing);
    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      estimation(60),
    ]);
    processingRepository.findMany.mockResolvedValueOnce([
      makeProcessing({
        started_at: new Date("2024-02-29T23:59:30.000Z"),
        finished_at: null,
      }),
    ]);

    vi.useFakeTimers({ now });

    const result = await service.execute(request(processing.id));

    expect(result.estimated_finish_time).toBeInstanceOf(Date);
    expect(result.estimated_start_time).toEqual(started_at);
  });

  it("should clamp a backlog process that already exceeded its estimate", async () => {
    const now = new Date("2024-03-01T00:00:00.000Z");
    const started_at = new Date("2024-02-29T23:59:00.000Z");
    const processing = makeProcessing({ started_at, finished_at: null });

    processingRepository.findOne.mockResolvedValueOnce(processing);
    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      estimation(10),
    ]);
    processingRepository.findMany.mockResolvedValueOnce([
      makeProcessing({
        started_at: new Date("2024-02-29T22:00:00.000Z"),
        finished_at: null,
      }),
    ]);

    vi.useFakeTimers({ now });

    const result = await service.execute(request(processing.id));

    expect(result.estimated_finish_time).toBeInstanceOf(Date);
  });

  it("should skip a backlog process whose pair has no recorded history", async () => {
    const now = new Date("2024-03-01T00:00:00.000Z");
    const started_at = new Date("2024-02-29T23:59:00.000Z");
    const processing = makeProcessing({ started_at, finished_at: null });

    processingRepository.findOne.mockResolvedValueOnce(processing);
    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      estimation(60),
    ]);
    processingRepository.findMany.mockResolvedValueOnce([
      processingFactory.build({
        dataset_id: datasetFactory.build().id,
        processor_id: processorFactory.build().id,
        started_at: null,
        finished_at: null,
      }),
    ]);

    vi.useFakeTimers({ now });

    const result = await service.execute(request(processing.id));

    const { ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS } =
      getProcessingConfig();

    expect(result.estimated_finish_time).toEqual(
      new Date(
        started_at.getTime() +
          (ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS + 60) * 1000,
      ),
    );
  });

  it("should propagate a guard failure for an unknown processing", async () => {
    processingRepository.findOne.mockResolvedValueOnce(null);

    await expect(service.execute(request("missing"))).rejects.toMatchObject({
      key: "@processing_guard/PROCESSING_NOT_FOUND",
    });
    expect(
      processingRepository.getManyEstimatedExecutionTimes,
    ).not.toHaveBeenCalled();
  });
});

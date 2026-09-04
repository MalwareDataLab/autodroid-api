import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mock, MockProxy } from "vitest-mock-extended";

// Config import
import { getProcessingConfig } from "@config/processing";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

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
import { UserProcessingGetEstimatedExecutionTimeService } from "./userProcessingGetEstimatedExecutionTime.service";

describe("Service: UserProcessingGetEstimatedExecutionTimeService", () => {
  const user = userFactory.build();
  const dataset = datasetFactory.build({
    visibility: DATASET_VISIBILITY.PUBLIC,
  });
  const processor = processorFactory.build({
    visibility: PROCESSOR_VISIBILITY.PUBLIC,
  });

  let processingRepository: MockProxy<IProcessingRepository>;
  let datasetRepository: MockProxy<IDatasetRepository>;
  let processorRepository: MockProxy<IProcessorRepository>;

  let service: UserProcessingGetEstimatedExecutionTimeService;

  const request = () => ({
    user,
    dataset_id: dataset.id,
    processor_id: processor.id,
    language: "en",
  });

  beforeEach(() => {
    processingRepository = mock<IProcessingRepository>();
    datasetRepository = mock<IDatasetRepository>();
    processorRepository = mock<IProcessorRepository>();

    datasetRepository.findOne.mockResolvedValue(dataset);
    processorRepository.findOne.mockResolvedValue(processor);

    service = new UserProcessingGetEstimatedExecutionTimeService(
      processingRepository,
      datasetRepository,
      processorRepository,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return a null estimation when the pair has no recorded history", async () => {
    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce(
      [],
    );

    const result = await service.execute(request());

    expect(result).toEqual(
      expect.objectContaining({
        dataset_id: dataset.id,
        processor_id: processor.id,
        estimated_execution_time: null,
        estimated_waiting_time: null,
      }),
    );
    expect(processingRepository.findMany).not.toHaveBeenCalled();
  });

  it("should round the recorded average into the estimated execution time", async () => {
    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      {
        dataset_id: dataset.id,
        processor_id: processor.id,
        average_execution_time_seconds: 10.4,
      },
    ]);
    processingRepository.findMany.mockResolvedValueOnce([]);

    const result = await service.execute(request());

    expect(result.estimated_execution_time).toBe(10);
    expect(processingRepository.findMany).toHaveBeenCalledWith({
      finished: false,
    });
  });

  it("should seed the waiting time with the worker acquisition minimum", async () => {
    const { ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS } =
      getProcessingConfig();

    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      {
        dataset_id: dataset.id,
        processor_id: processor.id,
        average_execution_time_seconds: 10,
      },
    ]);
    processingRepository.findMany.mockResolvedValueOnce([]);

    const result = await service.execute(request());

    expect(result.estimated_waiting_time).toBe(
      ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS,
    );
  });

  it("should add the full estimate for a queued process that has not started", async () => {
    const { ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS } =
      getProcessingConfig();

    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      {
        dataset_id: dataset.id,
        processor_id: processor.id,
        average_execution_time_seconds: 10,
      },
    ]);
    processingRepository.findMany.mockResolvedValueOnce([
      processingFactory.build({
        dataset_id: dataset.id,
        processor_id: processor.id,
        started_at: null,
      }),
    ]);

    const result = await service.execute(request());

    expect(result.estimated_waiting_time).toBe(
      ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS + 10,
    );
  });

  it("should add only the remaining seconds for a running process", async () => {
    const { ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS } =
      getProcessingConfig();
    const now = new Date("2024-03-01T00:00:00.000Z");

    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      {
        dataset_id: dataset.id,
        processor_id: processor.id,
        average_execution_time_seconds: 10,
      },
    ]);
    processingRepository.findMany.mockResolvedValueOnce([
      processingFactory.build({
        dataset_id: dataset.id,
        processor_id: processor.id,
        started_at: new Date("2024-02-29T23:59:56.000Z"),
      }),
    ]);

    vi.useFakeTimers({ now });

    const result = await service.execute(request());

    expect(result.estimated_waiting_time).toBe(
      ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS + 6,
    );
  });

  it("should never subtract time for a process already past its estimate", async () => {
    const { ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS } =
      getProcessingConfig();
    const now = new Date("2024-03-01T00:00:00.000Z");

    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      {
        dataset_id: dataset.id,
        processor_id: processor.id,
        average_execution_time_seconds: 10,
      },
    ]);
    processingRepository.findMany.mockResolvedValueOnce([
      processingFactory.build({
        dataset_id: dataset.id,
        processor_id: processor.id,
        started_at: new Date("2024-02-29T23:00:00.000Z"),
      }),
    ]);

    vi.useFakeTimers({ now });

    const result = await service.execute(request());

    expect(result.estimated_waiting_time).toBe(
      ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS,
    );
  });

  it("should price a queued process with its own pair average, not the requested one", async () => {
    const { ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS } =
      getProcessingConfig();
    const otherDataset = datasetFactory.build();
    const otherProcessor = processorFactory.build();

    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      {
        dataset_id: dataset.id,
        processor_id: processor.id,
        average_execution_time_seconds: 10,
      },
      {
        dataset_id: otherDataset.id,
        processor_id: otherProcessor.id,
        average_execution_time_seconds: 600,
      },
    ]);
    processingRepository.findMany.mockResolvedValueOnce([
      processingFactory.build({
        dataset_id: otherDataset.id,
        processor_id: otherProcessor.id,
        started_at: null,
        finished_at: null,
      }),
    ]);

    const result = await service.execute(request());

    expect(result.estimated_waiting_time).toBe(
      ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS + 600,
    );
  });

  it("should skip a queued process whose pair has no recorded history", async () => {
    const { ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS } =
      getProcessingConfig();

    processingRepository.getManyEstimatedExecutionTimes.mockResolvedValueOnce([
      {
        dataset_id: dataset.id,
        processor_id: processor.id,
        average_execution_time_seconds: 10,
      },
    ]);
    processingRepository.findMany.mockResolvedValueOnce([
      processingFactory.build({
        dataset_id: datasetFactory.build().id,
        processor_id: processorFactory.build().id,
        started_at: null,
        finished_at: null,
      }),
    ]);

    const result = await service.execute(request());

    expect(result.estimated_waiting_time).toBe(
      ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS,
    );
  });

  it("should propagate a guard failure for an unknown dataset", async () => {
    datasetRepository.findOne.mockResolvedValueOnce(null);

    await expect(service.execute(request())).rejects.toMatchObject({
      key: "@processing_guard/DATASET_NOT_FOUND",
    });
    expect(
      processingRepository.getManyEstimatedExecutionTimes,
    ).not.toHaveBeenCalled();
  });
});

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from "vitest";

// Config import
import { getProcessingConfig } from "@config/processing";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// DTO import
import { IProcessingEstimatedDatasetProcessingTimeDTO } from "@modules/processing/types/IProcessing.dto";

// Schema import
import { AdminProcessingGetEstimatedExecutionTimeSchema } from "../schemas/adminProcessingEstimatedExecutionTime.schema";

// Service import
import { AdminProcessingEstimatedExecutionTimeIndexService } from "./adminProcessingEstimatedExecutionTimeIndex.service";

describe("Service: AdminProcessingEstimatedExecutionTimeIndexService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;

  let adminProcessingEstimatedExecutionTimeIndexService: AdminProcessingEstimatedExecutionTimeIndexService;

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

    adminProcessingEstimatedExecutionTimeIndexService =
      new AdminProcessingEstimatedExecutionTimeIndexService(
        processingRepositoryMock,
      );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should list the estimated execution times", async () => {
    const { ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS } =
      getProcessingConfig();

    const user = userFactory.build({ email: "luiz@laviola.dev" });

    const datasetWithProcesses = datasetFactory.build();
    const processorWithProcesses = processorFactory.build();

    const datasetWithoutEstimation = datasetFactory.build();
    const processorWithoutEstimation = processorFactory.build();

    const datasetWithoutProcesses = datasetFactory.build();
    const processorWithoutProcesses = processorFactory.build();

    const datasetPast = datasetFactory.build();
    const processorPast = processorFactory.build();

    const now = new Date("2023-06-01T00:00:00.000Z");

    const pendingProcessing = processingFactory.build(
      {
        started_at: null,
        finished_at: null,
        status: PROCESSING_STATUS.PENDING,
      },
      {
        associations: {
          dataset: datasetWithProcesses,
          processor: processorWithProcesses,
        },
      },
    );

    const runningProcessing = processingFactory.build(
      {
        started_at: new Date("2023-05-31T23:59:55.000Z"),
        finished_at: null,
        status: PROCESSING_STATUS.RUNNING,
      },
      {
        associations: {
          dataset: datasetWithProcesses,
          processor: processorWithProcesses,
        },
      },
    );

    const processingWithoutEstimation = processingFactory.build(
      {
        started_at: null,
        finished_at: null,
        status: PROCESSING_STATUS.PENDING,
      },
      {
        associations: {
          dataset: datasetWithoutEstimation,
          processor: processorWithoutEstimation,
        },
      },
    );

    const pastProcessing = processingFactory.build(
      {
        started_at: new Date("2023-05-31T23:58:20.000Z"),
        finished_at: null,
        status: PROCESSING_STATUS.RUNNING,
      },
      {
        associations: {
          dataset: datasetPast,
          processor: processorPast,
        },
      },
    );

    const estimations: IProcessingEstimatedDatasetProcessingTimeDTO[] = [
      {
        dataset_id: datasetWithProcesses.id,
        processor_id: processorWithProcesses.id,
        average_execution_time_seconds: 10,
      },
      {
        dataset_id: datasetWithoutProcesses.id,
        processor_id: processorWithoutProcesses.id,
        average_execution_time_seconds: 8,
      },
      {
        dataset_id: datasetPast.id,
        processor_id: processorPast.id,
        average_execution_time_seconds: 5,
      },
    ];

    processingRepositoryMock.getManyEstimatedExecutionTimes.mockResolvedValueOnce(
      estimations,
    );
    processingRepositoryMock.findMany.mockResolvedValueOnce([
      pendingProcessing,
      runningProcessing,
      processingWithoutEstimation,
      pastProcessing,
    ]);

    vi.useFakeTimers({ now });

    const response =
      await adminProcessingEstimatedExecutionTimeIndexService.execute({
        user,
        filter: {} as AdminProcessingGetEstimatedExecutionTimeSchema,
        language: "en",
      });

    expect(response).toHaveLength(3);

    const withProcesses = response.find(
      estimation =>
        estimation.dataset_id === datasetWithProcesses.id &&
        estimation.processor_id === processorWithProcesses.id,
    );
    expect(withProcesses?.estimated_execution_time).toBe(10);
    expect(withProcesses?.estimated_waiting_time).toBe(
      15 + ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS,
    );

    const withoutProcesses = response.find(
      estimation =>
        estimation.dataset_id === datasetWithoutProcesses.id &&
        estimation.processor_id === processorWithoutProcesses.id,
    );
    expect(withoutProcesses?.estimated_execution_time).toBe(8);
    expect(withoutProcesses?.estimated_waiting_time).toBeNull();

    const past = response.find(
      estimation =>
        estimation.dataset_id === datasetPast.id &&
        estimation.processor_id === processorPast.id,
    );
    expect(past?.estimated_execution_time).toBe(5);
    expect(past?.estimated_waiting_time).toBeNull();
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminProcessingEstimatedExecutionTimeIndexService.execute({
        user,
        filter: {} as AdminProcessingGetEstimatedExecutionTimeSchema,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});

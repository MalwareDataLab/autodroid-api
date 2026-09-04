import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  MockInstance,
  vi,
} from "vitest";
import { faker } from "@faker-js/faker";

// Config import
import { getWorkerConfig } from "@config/worker";

// Util import
import { logger } from "@shared/utils/logger";
import { validateProcessor } from "@modules/processor/utils/validateProcessor.util";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Provider import
import { IWebsocketProvider } from "@shared/container/providers/WebsocketProvider/models/IWebsocket.provider";

// Error import
import { AppError } from "@shared/errors/AppError";

// Target import
import { DatasetProcessorProvider } from "./datasetProcessorProvider";

vi.mock("@config/worker", () => ({ getWorkerConfig: vi.fn() }));
vi.mock("@shared/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));
vi.mock("@modules/processor/utils/validateProcessor.util", () => ({
  validateProcessor: vi.fn(),
}));

const getWorkerConfigMock = vi.mocked(getWorkerConfig);
const validateProcessorMock = vi.mocked(validateProcessor);

const workerJobsKey = "worker:JOBS";

const buildProcessing = (
  overrides: Record<string, unknown> = {},
  withFile = true,
) => {
  const dataset = withFile
    ? datasetFactory.build(
        {},
        {
          transient: { withRelations: true },
          associations: { file: fileFactory.build() },
        },
      )
    : datasetFactory.build();

  return processingFactory.build(
    { started_at: null, attempts: 0, ...overrides },
    { associations: { dataset } },
  );
};

describe("Provider: DatasetProcessorProvider", () => {
  let workerRepositoryMock: Mocked<IWorkerRepository>;
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let inMemoryDatabaseProviderMock: {
    initialization: Promise<void>;
    connection: {
      hdel: ReturnType<typeof vi.fn>;
      hset: ReturnType<typeof vi.fn>;
      hgetall: ReturnType<typeof vi.fn>;
      hincrby: ReturnType<typeof vi.fn>;
    };
  };
  let websocketProviderMock: Mocked<IWebsocketProvider>;
  let fileProcessSpy: MockInstance<typeof File.process>;

  let provider: DatasetProcessorProvider;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useRealTimers();

    getWorkerConfigMock.mockReturnValue({
      worker_max_concurrent_jobs: 2,
    } as any);
    validateProcessorMock.mockResolvedValue(undefined);

    workerRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

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

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: {
        hdel: vi.fn().mockResolvedValue(1),
        hset: vi.fn().mockResolvedValue(1),
        hgetall: vi.fn().mockResolvedValue({}),
        hincrby: vi.fn().mockResolvedValue(1),
      },
    };

    websocketProviderMock = {
      initialization: Promise.resolve(),
      sendMessageToRoom: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
    };

    fileProcessSpy = vi.spyOn(File, "process");

    provider = new DatasetProcessorProvider(
      workerRepositoryMock,
      processingRepositoryMock,
      inMemoryDatabaseProviderMock as any,
      websocketProviderMock,
    );
    await provider.initialization;
  });

  afterEach(() => {
    vi.useRealTimers();
    fileProcessSpy.mockRestore();
  });

  it("should register the worker status listener and persist a valid update", async () => {
    const worker = workerFactory.build();
    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(worker);

    const [, listener] = websocketProviderMock.on.mock.calls[0];

    (listener as any)({
      worker_id: worker.id,
      name: worker.name,
      version: worker.version,
      processing_ids: ["a", "b"],
    });

    await vi.waitFor(() => {
      expect(inMemoryDatabaseProviderMock.connection.hset).toHaveBeenCalledWith(
        workerJobsKey,
        worker.id,
        "2",
      );
    });
    expect(workerRepositoryMock.updateOne).toHaveBeenCalled();
  });

  it("should evict and throw when the status worker is not found", async () => {
    const worker_id = faker.string.uuid();
    workerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      (provider as any).handleWorkerStatus({
        worker_id,
        data: { processing_ids: [], name: "w", version: "1" },
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_processor_provider_handle_worker_status/WORKER_NOT_FOUND",
      }),
    );
    expect(inMemoryDatabaseProviderMock.connection.hdel).toHaveBeenCalledWith(
      workerJobsKey,
      worker_id,
    );
  });

  it("should throw when getWorkerById does not find the worker", async () => {
    const worker_id = faker.string.uuid();
    workerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      (provider as any).getWorkerById(worker_id),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_processor_provider_get_worker_by_id/WORKER_NOT_FOUND",
      }),
    );
    expect(inMemoryDatabaseProviderMock.connection.hdel).toHaveBeenCalledWith(
      workerJobsKey,
      worker_id,
    );
  });

  it("should return the worker when it responds with a status", async () => {
    const worker = workerFactory.build();
    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);
    websocketProviderMock.once.mockImplementationOnce((_event, l) =>
      (l as any)({}),
    );

    await expect((provider as any).getWorkerById(worker.id)).resolves.toEqual(
      worker,
    );
    expect(websocketProviderMock.sendMessageToRoom).toHaveBeenCalledWith(
      `worker:${worker.id}`,
      "worker:get-status",
    );
  });

  it("should reject with a timeout when the worker does not respond", async () => {
    vi.useFakeTimers();
    const worker = workerFactory.build();
    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);

    const promise = (provider as any)
      .getWorkerById(worker.id)
      .catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(5000);
    const error = await promise;

    expect(error).toEqual(
      expect.objectContaining({
        key: "@dataset_processor_provider_get_worker_by_id/WORKER_TIMEOUT",
      }),
    );
    expect(websocketProviderMock.off).toHaveBeenCalled();
    expect(inMemoryDatabaseProviderMock.connection.hdel).toHaveBeenCalledWith(
      workerJobsKey,
      worker.id,
    );
  });

  it("should reject as not available when the status request throws", async () => {
    const worker = workerFactory.build();
    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);
    websocketProviderMock.sendMessageToRoom.mockRejectedValueOnce(
      new Error("socket down"),
    );

    await expect(
      (provider as any).getWorkerById(worker.id),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_processor_provider_get_worker_by_id/WORKER_NOT_AVAILABLE",
      }),
    );
  });

  it("should dispatch a process to a worker successfully", async () => {
    const worker = workerFactory.build();
    const processing = buildProcessing();
    const updatedProcessing = buildProcessing();

    vi.spyOn(provider as any, "getWorkerById").mockResolvedValueOnce(worker);
    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    const processedFile = fileFactory.build();
    processedFile.public_url = faker.internet.url();
    processedFile.provider_status = FILE_PROVIDER_STATUS.READY;
    fileProcessSpy.mockResolvedValueOnce(processedFile);
    websocketProviderMock.once.mockImplementationOnce((_event, l) =>
      (l as any)({}),
    );
    processingRepositoryMock.updateOne.mockResolvedValueOnce(updatedProcessing);

    const result = await (provider as any).dispatchProcessToWorker({
      worker_id: worker.id,
      processing_id: processing.id,
    });

    expect(result).toEqual(updatedProcessing);
    expect(processingRepositoryMock.updateOne).toHaveBeenCalledWith(
      { id: processing.id },
      { worker_id: worker.id },
    );
  });

  it("should dispatch logging the worker id when the worker has no name", async () => {
    const worker = workerFactory.build({ name: null as any });
    const processing = buildProcessing();

    vi.spyOn(provider as any, "getWorkerById").mockResolvedValueOnce(worker);
    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    const processedFile = fileFactory.build();
    processedFile.public_url = faker.internet.url();
    processedFile.provider_status = FILE_PROVIDER_STATUS.READY;
    fileProcessSpy.mockResolvedValueOnce(processedFile);
    websocketProviderMock.once.mockImplementationOnce((_event, l) =>
      (l as any)({}),
    );
    processingRepositoryMock.updateOne.mockResolvedValueOnce(processing);

    await (provider as any).dispatchProcessToWorker({
      worker_id: worker.id,
      processing_id: processing.id,
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining(worker.id),
    );
  });

  it("should throw when the processing to dispatch is not found", async () => {
    const worker = workerFactory.build();
    vi.spyOn(provider as any, "getWorkerById").mockResolvedValueOnce(worker);
    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      (provider as any).dispatchProcessToWorker({
        worker_id: worker.id,
        processing_id: faker.string.uuid(),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_processor_provider_dispatch_process/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw when the processing has already started", async () => {
    const worker = workerFactory.build();
    const processing = buildProcessing({ started_at: new Date() });
    vi.spyOn(provider as any, "getWorkerById").mockResolvedValueOnce(worker);
    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await expect(
      (provider as any).dispatchProcessToWorker({
        worker_id: worker.id,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_processor_provider_dispatch_process/PROCESSING_ALREADY_STARTED",
      }),
    );
  });

  it("should throw when the dataset file is missing", async () => {
    const worker = workerFactory.build();
    const processing = buildProcessing({}, false);
    vi.spyOn(provider as any, "getWorkerById").mockResolvedValueOnce(worker);
    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await expect(
      (provider as any).dispatchProcessToWorker({
        worker_id: worker.id,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_processor_provider_dispatch_process/FILE_NOT_FOUND",
      }),
    );
  });

  it("should throw when the processed dataset has no public url", async () => {
    const worker = workerFactory.build();
    const processing = buildProcessing({ attempts: 3 });
    vi.spyOn(provider as any, "getWorkerById").mockResolvedValueOnce(worker);
    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    const processedFile = fileFactory.build();
    processedFile.public_url = null as any;
    processedFile.provider_status = FILE_PROVIDER_STATUS.READY;
    fileProcessSpy.mockResolvedValueOnce(processedFile);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(processing);

    await expect(
      (provider as any).dispatchProcessToWorker({
        worker_id: worker.id,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_processor_provider_dispatch_process/DATASET_NOT_AVAILABLE",
      }),
    );
    expect(processingRepositoryMock.updateOne).toHaveBeenCalledWith(
      { id: processing.id },
      expect.objectContaining({ message: "Dataset not available." }),
    );
  });

  it("should throw when the processed dataset is not ready", async () => {
    const worker = workerFactory.build();
    const processing = buildProcessing();
    vi.spyOn(provider as any, "getWorkerById").mockResolvedValueOnce(worker);
    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    const processedFile = fileFactory.build();
    processedFile.public_url = faker.internet.url();
    processedFile.provider_status = FILE_PROVIDER_STATUS.PENDING;
    fileProcessSpy.mockResolvedValueOnce(processedFile);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(processing);

    await expect(
      (provider as any).dispatchProcessToWorker({
        worker_id: worker.id,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_processor_provider_dispatch_process/DATASET_NOT_AVAILABLE",
      }),
    );
  });

  it("should reject when the worker does not acquire the processing in time", async () => {
    vi.useFakeTimers();
    const worker = workerFactory.build();
    const processing = buildProcessing();
    vi.spyOn(provider as any, "getWorkerById").mockResolvedValueOnce(worker);
    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    const processedFile = fileFactory.build();
    processedFile.public_url = faker.internet.url();
    processedFile.provider_status = FILE_PROVIDER_STATUS.READY;
    fileProcessSpy.mockResolvedValueOnce(processedFile);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(processing);

    const promise = (provider as any)
      .dispatchProcessToWorker({
        worker_id: worker.id,
        processing_id: processing.id,
      })
      .catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(30000);
    const error = await promise;

    expect(error).toEqual(
      expect.objectContaining({
        key: "@dataset_processor_provider_dispatch_process/PROCESSING_NOT_ACQUIRED",
      }),
    );
    expect(websocketProviderMock.off).toHaveBeenCalled();
  });

  it("should wrap non-app errors as a dispatch error and swallow the update failure", async () => {
    const worker = workerFactory.build();
    const processing = buildProcessing();
    vi.spyOn(provider as any, "getWorkerById").mockResolvedValueOnce(worker);
    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    fileProcessSpy.mockRejectedValueOnce(new Error("boom"));
    processingRepositoryMock.updateOne.mockRejectedValueOnce(
      new Error("update failed"),
    );

    await expect(
      (provider as any).dispatchProcessToWorker({
        worker_id: worker.id,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_processor_provider_dispatch_process/PROCESSING_DISPATCH_ERROR",
      }),
    );
    expect(processingRepositoryMock.updateOne).toHaveBeenCalledWith(
      { id: processing.id },
      expect.objectContaining({ message: "An error occurred." }),
    );
  });

  it("should return empty results when there are no processes to dispatch", async () => {
    processingRepositoryMock.findMany.mockResolvedValueOnce([]);

    const result = await provider.dispatchNotStartedProcesses({
      processing_ids: [],
    });

    expect(result).toEqual({ dispatched: [], failed: [], skipped: [] });
    expect(logger.info).toHaveBeenCalledWith("🆗 No processes to dispatch.");
  });

  it("should throw when there are no workers available", async () => {
    processingRepositoryMock.findMany.mockResolvedValueOnce([
      buildProcessing(),
    ]);
    inMemoryDatabaseProviderMock.connection.hgetall.mockResolvedValueOnce(null);

    await expect(
      provider.dispatchNotStartedProcesses({ processing_ids: [] }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_processor_provider_dispatch_process/NO_WORKER_AVAILABLE",
      }),
    );
  });

  it("should throw when all workers are busy", async () => {
    processingRepositoryMock.findMany.mockResolvedValueOnce([
      buildProcessing(),
    ]);
    inMemoryDatabaseProviderMock.connection.hgetall.mockResolvedValueOnce({
      "worker-a": "2",
    });

    await expect(
      provider.dispatchNotStartedProcesses({ processing_ids: [] }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_processor_provider_dispatch_process/ALL_WORKERS_BUSY",
      }),
    );
  });

  it("should dispatch a not started process to an available worker", async () => {
    const processing = buildProcessing();
    processingRepositoryMock.findMany.mockResolvedValueOnce([processing]);
    inMemoryDatabaseProviderMock.connection.hgetall.mockResolvedValueOnce({
      "worker-a": "0",
      "worker-b": "not-a-number",
    });
    const dispatchSpy = vi
      .spyOn(provider as any, "dispatchProcessToWorker")
      .mockResolvedValue(processing);

    const result = await provider.dispatchNotStartedProcesses({
      processing_ids: [],
    });

    expect(dispatchSpy).toHaveBeenCalled();
    expect(result.dispatched).toContain(processing);
    expect(result.skipped).toHaveLength(0);
  });

  it("should collect app errors as failed dispatches", async () => {
    const processing = buildProcessing();
    processingRepositoryMock.findMany.mockResolvedValueOnce([processing]);
    inMemoryDatabaseProviderMock.connection.hgetall.mockResolvedValueOnce({
      "worker-a": "0",
    });
    vi.spyOn(provider as any, "dispatchProcessToWorker").mockRejectedValue(
      new AppError({
        key: "@dataset_processor_provider_dispatch_process/PROCESSING_DISPATCH_ERROR",
        message: "dispatch failed",
      }),
    );

    await provider.dispatchNotStartedProcesses({ processing_ids: [] });

    expect(logger.error).toHaveBeenCalled();
  });

  it("should rethrow non-app errors raised while dispatching", async () => {
    const processing = buildProcessing();
    processingRepositoryMock.findMany.mockResolvedValueOnce([processing]);
    inMemoryDatabaseProviderMock.connection.hgetall.mockResolvedValueOnce({
      "worker-a": "0",
    });
    vi.spyOn(provider as any, "dispatchProcessToWorker").mockRejectedValue(
      new Error("fatal"),
    );

    await expect(
      provider.dispatchNotStartedProcesses({ processing_ids: [] }),
    ).rejects.toThrowError("fatal");
  });
});

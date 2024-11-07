import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Repository import
import {
  IProcessingRepository,
  IWorkerRepository,
} from "@shared/container/repositories";

// Util import
import { validateProcessor } from "@modules/processor/utils/validateProcessor.util";

// Entity import
import { File } from "@modules/file/entities/file.entity";
import { Worker } from "@modules/worker/entities/worker.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";
import { IWebsocketProvider } from "@shared/container/providers/WebsocketProvider/models/IWebsocket.provider";

// Type import
import { ISocketWorkerStatusMessage } from "@shared/infrastructure/websocket/socket.types";
import { IDispatchProcessDTO } from "../types/IDatasetProcessor.dto";

// Interface import
import { IDatasetProcessorProvider } from "../models/IDatasetProcessor.provider";

@injectable()
class DatasetProcessorProvider implements IDatasetProcessorProvider {
  public readonly initialization: Promise<void>;

  private readonly inMemoryIdleKey = "worker:IDLE";

  constructor(
    @inject("WorkerRepository")
    private workerRepository: IWorkerRepository,

    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,

    @inject("WebsocketProvider")
    public websocketProvider: IWebsocketProvider,
  ) {
    this.initialization = this.init();
  }

  private async init(): Promise<void> {
    await this.websocketProvider.initialization;
    await this.inMemoryDatabaseProvider.initialization;

    this.websocketProvider.on("worker:status", ({ worker_id, ...data }) =>
      this.handleWorkerStatus({
        worker_id,
        data,
      }),
    );
  }

  private async handleWorkerStatus({
    worker_id,
    data,
  }: {
    worker_id: string;
    data: ISocketWorkerStatusMessage;
  }): Promise<void> {
    const worker = await this.workerRepository.findOne({ id: worker_id });

    if (!worker)
      throw new AppError({
        key: "@dataset_processor_provider_handle_worker_status/WORKER_NOT_FOUND",
        message: "Worker not found.",
      });

    if (data.status === "WORK") {
      await this.inMemoryDatabaseProvider.connection.del(
        `${this.inMemoryIdleKey}:${worker_id}`,
      );
    } else if (data.status === "IDLE") {
      await this.inMemoryDatabaseProvider.connection.set(
        `${this.inMemoryIdleKey}:${worker_id}`,
        "1",
      );
    }

    await this.workerRepository.updateOne(
      { id: worker.id },
      { version: data.version, last_seen_at: new Date() },
    );
  }

  private async getWorkerById(worker_id: string): Promise<Worker> {
    const worker = await this.workerRepository.findOne({ id: worker_id });

    if (!worker)
      throw new AppError({
        key: "@dataset_processor_provider_get_worker_by_id/WORKER_NOT_FOUND",
        message: "Worker not found.",
      });

    try {
      await this.websocketProvider.sendMessageToRoom(
        `worker:${worker_id}`,
        "worker:get-status",
      );

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new AppError({
              key: "@dataset_processor_provider_get_worker_by_id/WORKER_TIMEOUT",
              message: "Worker timeout.",
            }),
          );
        }, 5000);

        this.websocketProvider.once(
          `worker:${worker_id}:status`,
          async data => {
            if (data.status === "WORK" && data.processing_ids.length === 0) {
              clearTimeout(timeout);
              resolve(data);
            }
          },
        );
      });

      return worker;
    } catch (error) {
      if (AppError.isInstance(error)) throw error;

      throw new AppError({
        key: "@dataset_processor_provider_get_worker_by_id/WORKER_NOT_AVAILABLE",
        message: "Worker not available.",
      });
    }
  }

  private async getAvailableWorkerIds(): Promise<string[]> {
    const [, workers] = await this.inMemoryDatabaseProvider.connection.scan(
      "0",
      "MATCH",
      `${this.inMemoryIdleKey}:*`,
      "COUNT",
      10,
    );

    return workers || [];
  }

  private async dispatchProcessToWorker(
    params: IDispatchProcessDTO & { worker_id: string },
  ): Promise<Processing> {
    const { processing_id } = params;
    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

    const worker = await this.getWorkerById(params.worker_id);

    if (!processing)
      throw new AppError({
        key: "@dataset_processor_provider_dispatch_process/PROCESSING_NOT_FOUND",
        message: "Processing not found.",
      });

    if (processing.started_at)
      throw new AppError({
        key: "@dataset_processor_provider_dispatch_process/PROCESSING_ALREADY_STARTED",
        message: "Processing already started.",
      });

    if (!processing.dataset.file)
      throw new AppError({
        key: "@dataset_processor_provider_dispatch_process/FILE_NOT_FOUND",
        message: "Dataset file not found.",
      });

    await validateProcessor(processing.processor);

    try {
      const file = await File.process(processing.dataset.file);

      if (
        !file.public_url ||
        file.provider_status !== FILE_PROVIDER_STATUS.READY
      )
        throw new AppError({
          key: "@dataset_processor_provider_dispatch_process/DATASET_NOT_AVAILABLE",
          message: "Dataset not available.",
        });

      const updateProcessing = await this.processingRepository.updateOne(
        { id: processing.id },
        { worker_id: worker.id },
      );

      if (!updateProcessing)
        throw new AppError({
          key: "@dataset_processor_provider_dispatch_process/PROCESSING_UPDATE_ERROR",
          message: "Fail to update processing.",
        });

      await this.websocketProvider.sendMessageToRoom(
        `worker:${worker.id}`,
        "worker:work",
        { processing_id },
      );

      return processing;
    } catch (error) {
      const isAppError = AppError.isInstance(error);
      await this.processingRepository
        .updateOne(
          { id: processing.id },
          {
            attempts: processing.attempts || 0 + 1,
            message: isAppError ? error.message : "An error occurred.",
          },
        )
        .catch(() => null);

      if (!isAppError) throw error;
      throw new AppError({
        key: "@dataset_processor_provider_dispatch_process/PROCESSING_FILE_ERROR",
        message: error.message,
        debug: { error },
      });
    }
  }

  public async dispatchProcess(
    params: IDispatchProcessDTO,
  ): Promise<Processing> {
    const workerIds = await this.getAvailableWorkerIds();

    if (workerIds.length === 0)
      throw new AppError({
        key: "@dataset_processor_provider_dispatch_process/NO_WORKER_AVAILABLE",
        message: "No worker available.",
      });

    const worker_id = workerIds[0];

    const worker = await this.getWorkerById(worker_id);

    return this.dispatchProcessToWorker({ ...params, worker_id: worker.id });
  }
}

export { DatasetProcessorProvider };

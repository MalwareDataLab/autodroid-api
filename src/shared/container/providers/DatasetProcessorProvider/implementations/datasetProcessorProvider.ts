import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Repository import
import {
  IDatasetRepository,
  IProcessingRepository,
} from "@shared/container/repositories";

// Entity import
import { File } from "@modules/file/entities/file.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";
import { IWebsocketProvider } from "@shared/container/providers/WebsocketProvider/models/IWebsocket.provider";

// Interface import
import { IDatasetProcessorProvider } from "../models/IDatasetProcessor.provider";

// DTO import
import { IDispatchProcessDTO } from "../types/IDatasetProcessor.dto";

@injectable()
class DatasetProcessorProvider implements IDatasetProcessorProvider {
  public readonly initialization: Promise<void>;

  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,

    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("StorageProvider")
    private storageProvider: IStorageProvider,

    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,

    @inject("WebsocketProvider")
    public websocketProvider: IWebsocketProvider,
  ) {}

  public async dispatchProcess(
    params: IDispatchProcessDTO,
  ): Promise<Processing> {
    const { processing_id } = params;
    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

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

      await this.websocketProvider.sendMessageToRoom(
        "worker",
        "workerProcessingJob",
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
}

export { DatasetProcessorProvider };

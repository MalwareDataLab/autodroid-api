import { inject, injectable } from "tsyringe";
import {
  IDatasetRepository,
  IProcessingRepository,
} from "@shared/container/repositories";
import { File } from "@modules/file/entities/file.entity";
import { Processing } from "@modules/processing/entities/processing.entity";
import { IDatasetProcessorProvider } from "../models/IDatasetProcessor.provider";
import { IStorageProvider } from "../../StorageProvider/models/IStorage.provider";
import {
  ICreateProcessDTO,
  IDispatchProcessDTO,
} from "../types/IDatasetProcessor.dto";

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
  ) {}

  createProcess(_: ICreateProcessDTO): Promise<Processing> {
    throw new Error("Method not implemented.");
  }
  dispatchProcess(_: IDispatchProcessDTO): Promise<Processing> {
    throw new Error("Method not implemented.");
  }
  handleProcessProgress(): Promise<Processing> {
    throw new Error("Method not implemented.");
  }
  generateProcessUploadFile(): Promise<File> {
    throw new Error("Method not implemented.");
  }
  handleProcessUploadFile(): Promise<File> {
    throw new Error("Method not implemented.");
  }
  handleProcessSuccess(): Promise<Processing> {
    throw new Error("Method not implemented.");
  }
  handleProcessFailure(): Promise<Processing> {
    throw new Error("Method not implemented.");
  }
}

export { DatasetProcessorProvider };

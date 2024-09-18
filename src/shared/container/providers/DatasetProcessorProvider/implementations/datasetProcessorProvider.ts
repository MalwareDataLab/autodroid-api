// Interface import
import { inject, injectable } from "tsyringe";
import { IDatasetRepository } from "@shared/container/repositories";
import { IDatasetProcessorProvider } from "../models/IDatasetProcessor.provider";

@injectable()
class DatasetProcessorProvider implements IDatasetProcessorProvider {
  public readonly initialization: Promise<void>;

  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,
  ) {}
}

export { DatasetProcessorProvider };

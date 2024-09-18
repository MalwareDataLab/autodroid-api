import { inject, injectable } from "tsyringe";

// Repository import
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Processing } from "../entities/processing.entity";

// Guard import
import { ProcessingGuard } from "../guards/processing.guard";

interface IRequest {
  user: User;

  processing_id: string;

  language: string;
}

@injectable()
class UserProcessingShowService {
  private processingGuard: ProcessingGuard;
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,

    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,
  ) {
    this.processingGuard = new ProcessingGuard(
      this.processingRepository,
      this.datasetRepository,
      this.processorRepository,
    );
  }

  public async execute({
    user,

    processing_id,

    language,
  }: IRequest): Promise<Processing> {
    const { processing } = await this.processingGuard.execute({
      processing_id,

      user,
      language,
    });

    return processing;
  }
}

export { UserProcessingShowService };

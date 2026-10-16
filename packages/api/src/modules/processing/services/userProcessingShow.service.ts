import { inject, injectable } from "tsyringe";

// Guard import
import { ProcessingGuard } from "../guards/processing.guard";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Processing } from "../entities/processing.entity";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";

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

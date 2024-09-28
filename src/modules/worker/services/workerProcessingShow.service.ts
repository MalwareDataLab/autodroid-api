import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Entity import
import { Processing } from "@modules/processing/entities/processing.entity";

// Entity import
import { Worker } from "../entities/worker.entity";

interface IRequest {
  worker: Worker;
  processing_id: string;
}

@injectable()
class WorkerProcessingShowService {
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,
  ) {}

  public async execute({ processing_id }: IRequest): Promise<Processing> {
    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

    if (!processing)
      throw new AppError({
        key: "@worker_processing_show_service/PROCESSING_NOT_FOUND",
        message: "Processing not found.",
      });

    return processing;
  }
}

export { WorkerProcessingShowService };

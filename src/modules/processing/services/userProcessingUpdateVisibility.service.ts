import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

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

// Enum import
import { PROCESSING_VISIBILITY } from "../types/processingVisibility.enum";

interface IRequest {
  user: User;

  processing_id: string;
  visibility: PROCESSING_VISIBILITY;

  language: string;
}

@injectable()
class UserProcessingUpdateVisibilityService {
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
    visibility,

    language,
  }: IRequest): Promise<Processing> {
    const { processing, t } = await this.processingGuard.execute({
      processing_id,

      user,
      language,
    });

    if (processing.user_id !== user.id)
      throw new AppError({
        key: "@user_processing_update_visibility_service/CANNOT_UPDATE_PROCESSING_VISIBILITY",
        message: t(
          "@user_processing_update_visibility_service/CANNOT_UPDATE_PROCESSING_VISIBILITY",
          "You cannot change the visibility of a processing that not belongs to you.",
        ),
      });

    const updatedProcessing = await this.processingRepository.updateOne(
      { id: processing_id },
      { visibility },
    );

    if (!updatedProcessing)
      throw new AppError({
        key: "@user_processing_update_visibility_service/PROCESSING_NOT_FOUND_AFTER_UPDATE",
        message: t(
          "@user_processing_update_visibility_service/PROCESSING_NOT_FOUND_AFTER_UPDATE",
          "Processing not found.",
        ),
      });

    return updatedProcessing;
  }
}

export { UserProcessingUpdateVisibilityService };

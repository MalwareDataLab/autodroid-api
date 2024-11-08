import { inject, injectable } from "tsyringe";

// Configuration import
import { getProcessingConfig } from "@config/processing";

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
import { DateHelper } from "@shared/utils/dateHelpers";
import { Processing } from "../entities/processing.entity";

// Guard import
import { ProcessingGuard } from "../guards/processing.guard";

interface IRequest {
  user: User;

  processing_id: string;
  keep_until: Date;

  language: string;
}

@injectable()
class UserProcessingExtendKeepUntilService {
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
    keep_until,

    language,
  }: IRequest): Promise<Processing> {
    const processingConfig = getProcessingConfig();

    const { processing, t } = await this.processingGuard.execute({
      processing_id,

      user,
      language,
    });

    if (processing.user_id !== user.id)
      throw new AppError({
        key: "@user_processing_extend_keep_until_service/CANNOT_EXTEND_PROCESSING_KEEP_UNTIL",
        message: t(
          "@user_processing_extend_keep_until_service/CANNOT_EXTEND_PROCESSING_KEEP_UNTIL",
          "You cannot extend the keep until configuration of a processing that not belongs to you.",
        ),
      });

    const target_keep_until = DateHelper.parse(keep_until);

    if (!target_keep_until?.isValid())
      throw new AppError({
        key: "@user_processing_extend_keep_until_service/INVALID_KEEP_UNTIL",
        message: t(
          "@user_processing_extend_keep_until_service/INVALID_KEEP_UNTIL",
          "Invalid keep until date.",
        ),
      });

    if (
      target_keep_until.isAfter(
        DateHelper.now().add(
          processingConfig.PROCESSING_ALLOWED_KEEP_UNTIL_EXTEND_MS,
          "milliseconds",
        ),
      )
    )
      throw new AppError({
        key: "@user_processing_extend_keep_until_service/KEEP_UNTIL_EXCEEDED",
        message: t(
          "@user_processing_extend_keep_until_service/KEEP_UNTIL_EXCEEDED",
          "Keep until date must be at most 1 month from now.",
        ),
      });

    const updatedProcessing = await this.processingRepository.updateOne(
      { id: processing_id },
      { keep_until },
    );

    if (!updatedProcessing)
      throw new AppError({
        key: "@user_processing_extend_keep_until_service/PROCESSING_NOT_FOUND_AFTER_UPDATE",
        message: t(
          "@user_processing_extend_keep_until_service/PROCESSING_NOT_FOUND_AFTER_UPDATE",
          "Processing not found.",
        ),
      });

    return updatedProcessing;
  }
}

export { UserProcessingExtendKeepUntilService };

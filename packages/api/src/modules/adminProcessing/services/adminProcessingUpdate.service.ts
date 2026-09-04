import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Schema import
import { AdminProcessingUpdateSchema } from "../schemas/adminProcessing.schema";

interface IRequest {
  processing_id: string;
  data: AdminProcessingUpdateSchema;

  user: User;
  language: string;
}

@injectable()
class AdminProcessingUpdateService {
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    processing_id,
    data,
    language,
  }: IRequest): Promise<Processing> {
    const t = await i18n(language);

    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

    if (!processing)
      throw new AppError({
        key: "@admin_processing_update_service/PROCESSING_NOT_FOUND",
        message: t(
          "@admin_processing_update_service/PROCESSING_NOT_FOUND",
          "Processing not found.",
        ),
      });

    const updatedProcessing = await this.processingRepository.updateOne(
      { id: processing_id },
      data,
    );

    if (!updatedProcessing)
      throw new AppError({
        key: "@admin_processing_update_service/PROCESSING_NOT_UPDATED",
        message: t(
          "@admin_processing_update_service/PROCESSING_NOT_UPDATED",
          "Processing not updated.",
        ),
      });

    return updatedProcessing;
  }
}

export { AdminProcessingUpdateService };

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

interface IRequest {
  processing_id: string;

  user: User;
  language: string;
}

@injectable()
class AdminProcessingShowService {
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    processing_id,
    language,
  }: IRequest): Promise<Processing> {
    const t = await i18n(language);

    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

    if (!processing)
      throw new AppError({
        key: "@admin_processing_show_service/PROCESSING_NOT_FOUND",
        message: t(
          "@admin_processing_show_service/PROCESSING_NOT_FOUND",
          "Processing not found.",
        ),
      });

    return processing;
  }
}

export { AdminProcessingShowService };

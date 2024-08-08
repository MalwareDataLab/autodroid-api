import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Repository import
import { IProcessorRepository } from "@shared/container/repositories";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Processor } from "@modules/processor/entities/processor.entity";

interface IRequest {
  processor_id: string;

  user: User;
  language: string;
}

@injectable()
class AdminProcessorShowService {
  constructor(
    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    processor_id,
    language,
  }: IRequest): Promise<Processor> {
    const t = await i18n(language);

    const processor = await this.processorRepository.findOne({
      id: processor_id,
    });

    if (!processor)
      throw new AppError({
        key: "@admin_processor_show_service/PROCESSOR_NOT_FOUND",
        message: t(
          "@admin_processor_show_service/PROCESSOR_NOT_FOUND",
          "Processor not found.",
        ),
      });

    return processor;
  }
}

export { AdminProcessorShowService };

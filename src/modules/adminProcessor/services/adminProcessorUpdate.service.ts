import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Repository import
import { IProcessorRepository } from "@shared/container/repositories";

// Util import
import { validateProcessorConfigurationParameters } from "@modules/processor/utils/validateProcessorConfigurationParameters.util";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Processor } from "@modules/processor/entities/processor.entity";

// Schema import
import { ProcessorSchema } from "@modules/processor/schemas/processor.schema";

interface IRequest {
  processor_id: string;
  data: ProcessorSchema;

  user: User;
  language: string;
}

@injectable()
class AdminProcessorUpdateService {
  constructor(
    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    processor_id,
    data,
    language,
  }: IRequest): Promise<Processor> {
    const t = await i18n(language);

    validateProcessorConfigurationParameters({
      parameters: data.configuration.parameters,
      t,
    });

    const processor = await this.processorRepository.updateOne(
      { id: processor_id },
      data,
    );

    if (!processor)
      throw new AppError({
        key: "@admin_processor_update_service/PROCESSOR_NOT_FOUND",
        message: t(
          "@admin_processor_update_service/PROCESSOR_NOT_FOUND",
          "Processor not found.",
        ),
      });

    return processor;
  }
}

export { AdminProcessorUpdateService };

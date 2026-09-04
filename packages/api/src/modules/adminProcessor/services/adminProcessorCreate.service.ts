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
import { validateAndGetProcessorAllowedMimeTypes } from "@modules/processor/utils/parseAndValidateProcessorAllowedMimeTypes.util";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Processor } from "@modules/processor/entities/processor.entity";

// Schema import
import { ProcessorSchema } from "@modules/processor/schemas/processor.schema";

interface IRequest {
  data: ProcessorSchema;

  user: User;
  language: string;
}

@injectable()
class AdminProcessorCreateService {
  constructor(
    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({ user, data, language }: IRequest): Promise<Processor> {
    const t = await i18n(language);

    const existingProcessor = await this.processorRepository.findOne({
      image_tag: data.image_tag,
    });

    if (existingProcessor)
      throw new AppError({
        key: "@admin_processor_create_service/PROCESSOR_ALREADY_EXISTS",
        message: t(
          "@admin_processor_create_service/PROCESSOR_ALREADY_EXISTS",
          "Processor already exists.",
        ),
      });

    const allowed_mime_types = validateAndGetProcessorAllowedMimeTypes({
      allowed_mime_types: data.allowed_mime_types,
      t,
    });

    validateProcessorConfigurationParameters({
      parameters: data.configuration.parameters,
      t,
    });

    const processor = await this.processorRepository.createOne({
      ...data,
      allowed_mime_types: allowed_mime_types.join(","),
      user_id: user.id,
      payload: {},
    });

    return processor;
  }
}

export { AdminProcessorCreateService };

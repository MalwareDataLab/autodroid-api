import { injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// JSON import
import processors from "@/processors.json";

// Entity import
import { Processor } from "../entities/processor.entity";

interface IRequest {
  code: string;

  language: string;
}

@injectable()
class ProcessorShowService {
  public async execute({ code, language }: IRequest): Promise<Processor> {
    const t = await i18n(language);

    const processor = processors.find(item => item.code === code);
    if (!processor)
      throw new AppError({
        key: "@processor_show_service/PROCESSOR_NOT_FOUND",
        message: t(
          "@processor_show_service/PROCESSOR_NOT_FOUND",
          "Processor not found",
        ),
      });

    return Processor.make({
      code,
      name: processor.name,
      description: processor.description,
      allowed_params: processor.allowed_params,
      allowed_mime_types: processor.allowed_mime_types,
      default_params: processor.default_params,
    });
  }
}

export { ProcessorShowService };

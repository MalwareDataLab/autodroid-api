import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Entity import
import { Processor } from "../entities/processor.entity";

// Repository import
import { IProcessorRepository } from "../repositories/IProcessor.repository";

// Enum import
import { PROCESSOR_VISIBILITY } from "../types/processorVisibility.enum";

interface IRequest {
  processor_id: string;

  language: string;
}

@injectable()
class UserProcessorShowService {
  constructor(
    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,
  ) {}

  public async execute({
    processor_id,
    language,
  }: IRequest): Promise<Processor> {
    const t = await i18n(language);

    const processor = await this.processorRepository.findOne({
      id: processor_id,
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    if (!processor)
      throw new AppError({
        key: "@user_processor_show_service/PROCESSOR_NOT_FOUND",
        message: t(
          "@user_processor_show_service/PROCESSOR_NOT_FOUND",
          "Processor not found.",
        ),
      });

    return processor;
  }
}

export { UserProcessorShowService };

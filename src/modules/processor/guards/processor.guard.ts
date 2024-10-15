import { inject, injectable } from "tsyringe";

// i18n import
import { i18n, TFunction } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Repository import
import { IProcessorRepository } from "@shared/container/repositories";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Processor } from "@modules/processor/entities/processor.entity";

// Enum import
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

interface IRequest {
  user: User;
  processor_id: string;
  language: string;
}

type IResponse = {
  processor: Processor;
  t: TFunction;
};

@injectable()
class ProcessorGuard {
  constructor(
    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,
  ) {}

  public async execute(params: IRequest): Promise<IResponse> {
    const { user, processor_id, language } = params;
    const t = await i18n(language);

    const processor = await this.processorRepository.findOne({
      id: processor_id,
    });

    if (!processor)
      throw new AppError({
        key: "@processor_guard/PROCESSOR_NOT_FOUND",
        message: t(
          "@processor_guard/PROCESSOR_NOT_FOUND",
          "Processor not found.",
        ),
      });

    if (!user.is_admin) {
      if (
        processor.visibility !== PROCESSOR_VISIBILITY.PUBLIC &&
        processor.user_id !== user.id
      )
        throw new AppError({
          key: "@processor_guard/PROCESSOR_NOT_PUBLIC",
          message: t(
            "@processor_guard/PROCESSOR_NOT_PUBLIC",
            "Processor not public.",
          ),
        });
    }

    return {
      processor,
      t,
    };
  }
}

export { ProcessorGuard };

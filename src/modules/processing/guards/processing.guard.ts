import { inject, injectable } from "tsyringe";

// i18n import
import { i18n, TFunction } from "@shared/i18n";

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
import { Dataset } from "@modules/dataset/entities/dataset.entity";
import { Processor } from "@modules/processor/entities/processor.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";
import { PROCESSING_VISIBILITY } from "../types/processingVisibility.enum";

interface IRequest {
  user: User;

  dataset_id?: string;
  processor_id?: string;
  processing_id?: string;

  language: string;
}

type IResponse<
  T extends IRequest,
  P = T["processing_id"] extends string ? true : false,
> = {
  processing: P extends true ? Processing : never;

  dataset: T["dataset_id"] extends string
    ? Dataset
    : P extends true
      ? Dataset
      : never;

  processor: T["processor_id"] extends string
    ? Processor
    : P extends true
      ? Dataset
      : never;

  t: TFunction;
};

@injectable()
class ProcessingGuard {
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,

    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,
  ) {}

  public async execute<T extends IRequest>(params: T): Promise<IResponse<T>> {
    const { user, processing_id, language } = params;
    const t = await i18n(language);

    const processing = processing_id
      ? await this.processingRepository.findOne({
          id: processing_id,
          dataset_id: params.dataset_id,
          processor_id: params.processor_id,
        })
      : undefined;

    if (processing_id) {
      if (!processing)
        throw new AppError({
          key: "@processing_guard/PROCESSING_NOT_FOUND",
          message: t(
            "@processing_guard/PROCESSING_NOT_FOUND",
            "Processing not found.",
          ),
        });

      if (!user.is_admin) {
        if (
          processing.visibility !== PROCESSING_VISIBILITY.PUBLIC &&
          processing.user_id !== user.id
        )
          throw new AppError({
            key: "@processing_guard/PROCESSOR_NOT_PUBLIC",
            message: t(
              "@processing_guard/PROCESSOR_NOT_PUBLIC",
              "Processing not public.",
            ),
          });
      }
    }

    const processor_id = params.processor_id || processing?.processor_id;

    const processor = processor_id
      ? await this.processorRepository.findOne({
          id: processor_id,
        })
      : undefined;

    if (processor_id) {
      if (!processor)
        throw new AppError({
          key: "@processing_guard/PROCESSOR_NOT_FOUND",
          message: t(
            "@processing_guard/PROCESSOR_NOT_FOUND",
            "Processor not found.",
          ),
        });

      if (!user.is_admin) {
        if (
          processor.visibility !== PROCESSOR_VISIBILITY.PUBLIC &&
          processor.user_id !== user.id
        )
          throw new AppError({
            key: "@processing_guard/PROCESSOR_NOT_PUBLIC",
            message: t(
              "@processing_guard/PROCESSOR_NOT_PUBLIC",
              "Processor not public.",
            ),
          });
      }
    }

    const dataset_id = params.dataset_id || processing?.dataset_id;

    const dataset = dataset_id
      ? await this.datasetRepository.findOne({
          id: dataset_id,
        })
      : undefined;

    if (dataset_id) {
      if (!dataset)
        throw new AppError({
          key: "@processing_guard/DATASET_NOT_FOUND",
          message: t(
            "@processing_guard/DATASET_NOT_FOUND",
            "Dataset not found.",
          ),
        });

      if (!user.is_admin) {
        if (
          dataset.visibility !== DATASET_VISIBILITY.PUBLIC &&
          dataset.user_id !== user.id
        )
          throw new AppError({
            key: "@processing_guard/DATASET_NOT_PUBLIC",
            message: t(
              "@processing_guard/DATASET_NOT_PUBLIC",
              "Dataset not public.",
            ),
          });
      }
    }

    return {
      dataset,
      processor,
      processing,

      t,
    } as IResponse<T>;
  }
}

export { ProcessingGuard };

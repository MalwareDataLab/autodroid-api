import { inject, injectable } from "tsyringe";

// Configuration import
import { getProcessingConfig } from "@config/processing";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Guard import
import { ProcessingGuard } from "../guards/processing.guard";

// Util import
import { validateAndParseProcessingParameters } from "@modules/processing/utils/validateAndParseProcessingParameters.util";
import { validateProcessor } from "@modules/processor/utils/validateProcessor.util";
import { DateUtils } from "@shared/utils/dateUtils";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// Entity import
import { File } from "@modules/file/entities/file.entity";
import { User } from "@modules/user/entities/user.entity";
import { Processing } from "../entities/processing.entity";

// Schema import
import { RequestDatasetProcessingSchema } from "../schemas/requestDatasetProcessing.schema";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";

interface IRequest {
  user: User;

  params: RequestDatasetProcessingSchema;

  language: string;
}

@injectable()
class UserRequestDatasetProcessingService {
  private processingGuard: ProcessingGuard;

  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,

    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,

    @inject("JobProvider")
    private jobProvider: IJobProvider,
  ) {
    this.processingGuard = new ProcessingGuard(
      this.processingRepository,
      this.datasetRepository,
      this.processorRepository,
    );
  }

  public async execute({
    user,

    params,

    language,
  }: IRequest): Promise<Processing> {
    const { processor_id, dataset_id, parameters } = params;

    const processingConfig = getProcessingConfig();

    const { dataset, processor, t } = await this.processingGuard.execute({
      processor_id,
      dataset_id,

      user,
      language,
    });

    const file = await File.process(dataset.file);

    if (!file.public_url || file.provider_status !== FILE_PROVIDER_STATUS.READY)
      throw new AppError({
        key: "@user_request_dataset_processing/DATASET_NOT_AVAILABLE",
        message: t(
          "@user_request_dataset_processing/DATASET_NOT_AVAILABLE",
          "Dataset not available.",
        ),
      });

    await validateProcessor(processor);

    const configuration = validateAndParseProcessingParameters({
      parameters,
      processor,
      t,
    });

    const processing = await this.processingRepository.createOne({
      user_id: user.id,
      dataset_id: dataset.id,
      processor_id: processor.id,

      started_at: null,
      finished_at: null,

      keep_until: DateUtils.now()
        .add(processingConfig.PROCESSING_DEFAULT_KEEP_UNTIL_MS, "milliseconds")
        .toDate(),

      configuration,
      payload: {},

      verified_at: null,
      visibility: PROCESSING_VISIBILITY.PRIVATE,
      status: PROCESSING_STATUS.PENDING,

      attempts: 0,
      message: null,

      reported_at: null,

      worker_id: null,
      result_file_id: null,
      metrics_file_id: null,
    });

    this.jobProvider.add("DispatchDatasetProcessingJob", {
      processing_ids: [processing.id],
    });

    return processing;
  }
}

export { UserRequestDatasetProcessingService };

import { inject, injectable } from "tsyringe";

// Configuration import
import { getProcessingConfig } from "@config/processing";

// Repository import
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { DateHelper } from "@shared/utils/dateHelpers";
import { Processing } from "../entities/processing.entity";

// Guard import
import { ProcessingGuard } from "../guards/processing.guard";

// Schema import
import { RequestDatasetProcessingSchema } from "../schemas/requestDatasetProcessing.schema";
import { validateAndParseProcessingParameters } from "../utils/validateAndParseProcessingParameters.util";
import { PROCESSING_VISIBILITY } from "../types/processingVisibility.enum";
import { PROCESSING_STATUS } from "../types/processingStatus.enum";

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

      keep_until: DateHelper.now()
        .add(processingConfig.PROCESSING_DEFAULT_KEEP_UNTIL_MS, "milliseconds")
        .toDate(),

      configuration,
      payload: {},

      visibility: PROCESSING_VISIBILITY.PRIVATE,
      status: PROCESSING_STATUS.PENDING,

      worker_id: null,
      result_file_id: null,
    });

    return processing;
  }
}

export { UserRequestDatasetProcessingService };

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from "vitest";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Repository import
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";
import { PROCESSOR_PARAMETER_TYPE } from "@modules/processor/types/processorParameterType.enum";

// Schema import

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { RequestDatasetProcessingSchema } from "../schemas/requestDatasetProcessing.schema";
import { processingFactory } from "../entities/factories/processing.factory";

// Service import
import { UserRequestDatasetProcessingService } from "./userRequestDatasetProcessing.service";

describe("Service: UserRequestDatasetProcessingService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let datasetRepositoryMock: Mocked<IDatasetRepository>;
  let processorRepositoryMock: Mocked<IProcessorRepository>;
  let jobProviderMock: Mocked<IJobProvider>;

  let userRequestDatasetProcessingService: UserRequestDatasetProcessingService;

  const user = userFactory.build();

  const seed = () => {
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = processorFactory.build({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      configuration: {
        parameters: [
          {
            sequence: 1,
            name: "alpha",
            description: "alpha description",
            type: PROCESSOR_PARAMETER_TYPE.STRING,
            is_required: false,
            default_value: null,
          },
        ],
        dataset_input_argument: "--input",
        dataset_input_value: "input.csv",
        dataset_output_argument: "--output",
        dataset_output_value: "output",
        command: "run",
        output_result_file_glob_patterns: ["*"],
        output_metrics_file_glob_patterns: ["*"],
      },
    });

    datasetRepositoryMock.findOne.mockResolvedValue(dataset);
    processorRepositoryMock.findOne.mockResolvedValue(processor);

    const params = {
      processor_id: processor.id,
      dataset_id: dataset.id,
      parameters: [],
    } as unknown as RequestDatasetProcessingSchema;

    return { dataset, processor, params };
  };

  beforeEach(() => {
    processingRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
      getOneEstimatedExecutionTime: vi.fn(),
      getManyEstimatedExecutionTimes: vi.fn(),
    };

    datasetRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    processorRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getAllowedMimeTypes: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    jobProviderMock = {
      initialization: Promise.resolve(),
      add: vi.fn(),
      close: vi.fn(),
    };

    userRequestDatasetProcessingService =
      new UserRequestDatasetProcessingService(
        processingRepositoryMock,
        datasetRepositoryMock,
        processorRepositoryMock,
        jobProviderMock,
      );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a processing and dispatch the job", async () => {
    const { params } = seed();

    const file = fileFactory.build({
      public_url: "https://example.com/file.csv",
      provider_status: FILE_PROVIDER_STATUS.READY,
    });
    vi.spyOn(File, "process").mockResolvedValueOnce(file);

    const processing = processingFactory.build();
    processingRepositoryMock.createOne.mockResolvedValueOnce(processing);

    const response = await userRequestDatasetProcessingService.execute({
      user,
      params,
      language: "en",
    });

    expect(response).toBe(processing);
    expect(jobProviderMock.add).toHaveBeenCalledWith(
      "DispatchDatasetProcessingJob",
      { processing_ids: [processing.id] },
    );
  });

  it("should throw when the dataset file is not available", async () => {
    const { params } = seed();

    const file = fileFactory.build({
      public_url: null,
      provider_status: FILE_PROVIDER_STATUS.PENDING,
    });
    vi.spyOn(File, "process").mockResolvedValueOnce(file);

    await expect(() =>
      userRequestDatasetProcessingService.execute({
        user,
        params,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_request_dataset_processing/DATASET_NOT_AVAILABLE",
      }),
    );
  });
});

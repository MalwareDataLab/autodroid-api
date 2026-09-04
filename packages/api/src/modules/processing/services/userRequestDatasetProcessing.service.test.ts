import { beforeEach, describe, it, expect, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Repository import
import { IProcessingRepository } from "../repositories/IProcessing.repository";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";
import { PROCESSOR_PARAMETER_TYPE } from "@modules/processor/types/processorParameterType.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Schema import
import { RequestDatasetProcessingSchema } from "../schemas/requestDatasetProcessing.schema";

// Target import
import { UserRequestDatasetProcessingService } from "./userRequestDatasetProcessing.service";

const validConfiguration = {
  parameters: [
    {
      sequence: 1,
      name: "alpha",
      description: "alpha description",
      type: PROCESSOR_PARAMETER_TYPE.STRING,
      is_required: true,
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
};

describe("Service: UserRequestDatasetProcessingService", () => {
  let userRequestDatasetProcessingService: UserRequestDatasetProcessingService;
  let processingRepository: IProcessingRepository;
  let jobProviderAdd: ReturnType<typeof vi.fn>;

  const seedAvailableDataset = async () => {
    const readyFile = await fileFactory.create({
      allow_public_access: true,
      public_url: faker.internet.url(),
      provider_status: FILE_PROVIDER_STATUS.READY,
    });

    return datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
      file_id: readyFile.id,
    });
  };

  beforeEach(context => {
    jobProviderAdd = vi.fn();
    context.container.registerInstance<IJobProvider>("JobProvider", {
      initialization: Promise.resolve(),
      add: jobProviderAdd,
      close: async () => undefined,
    });

    userRequestDatasetProcessingService = context.container.resolve(
      UserRequestDatasetProcessingService,
    );
    processingRepository = context.container.resolve("ProcessingRepository");
  });

  it("should create a processing and dispatch the job", async () => {
    const user = await userFactory.create();
    const dataset = await seedAvailableDataset();
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      configuration: validConfiguration,
    });

    const params = {
      dataset_id: dataset.id,
      processor_id: processor.id,
      parameters: [{ name: "alpha", value: "beta" }],
    } as unknown as RequestDatasetProcessingSchema;

    const response = await userRequestDatasetProcessingService.execute({
      user,
      params,
      language: "en",
    });

    expect(response.dataset_id).toBe(dataset.id);
    expect(response.processor_id).toBe(processor.id);
    expect(response.user_id).toBe(user.id);
    expect(jobProviderAdd).toHaveBeenCalledWith("DispatchDatasetProcessingJob", {
      processing_ids: [response.id],
    });

    await expect(
      processingRepository.findOne({ id: response.id }),
    ).resolves.toMatchObject({ id: response.id });
  });

  it("should throw when the dataset file is not available", async () => {
    const user = await userFactory.create();
    const pendingFile = await fileFactory.create({
      allow_public_access: false,
      public_url: null,
      public_url_expires_at: null,
      provider_status: FILE_PROVIDER_STATUS.PENDING,
    });
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
      file_id: pendingFile.id,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      configuration: validConfiguration,
    });

    await expect(() =>
      userRequestDatasetProcessingService.execute({
        user,
        params: {
          dataset_id: dataset.id,
          processor_id: processor.id,
          parameters: [{ name: "alpha", value: "beta" }],
        } as unknown as RequestDatasetProcessingSchema,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_request_dataset_processing/DATASET_NOT_AVAILABLE",
      }),
    );
  });

  it("should throw when the dataset was not found", async () => {
    const user = await userFactory.create();
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      configuration: validConfiguration,
    });

    await expect(() =>
      userRequestDatasetProcessingService.execute({
        user,
        params: {
          dataset_id: faker.string.uuid(),
          processor_id: processor.id,
          parameters: [],
        } as unknown as RequestDatasetProcessingSchema,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@processing_guard/DATASET_NOT_FOUND" }),
    );
  });

  it("should throw when the processor was not found", async () => {
    const user = await userFactory.create();
    const dataset = await seedAvailableDataset();

    await expect(() =>
      userRequestDatasetProcessingService.execute({
        user,
        params: {
          dataset_id: dataset.id,
          processor_id: faker.string.uuid(),
          parameters: [],
        } as unknown as RequestDatasetProcessingSchema,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@processing_guard/PROCESSOR_NOT_FOUND" }),
    );
  });

  it("should throw when a required parameter is missing", async () => {
    const user = await userFactory.create();
    const dataset = await seedAvailableDataset();
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      configuration: validConfiguration,
    });

    await expect(() =>
      userRequestDatasetProcessingService.execute({
        user,
        params: {
          dataset_id: dataset.id,
          processor_id: processor.id,
          parameters: [],
        } as unknown as RequestDatasetProcessingSchema,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/MISSING_PARAMETER",
      }),
    );
  });

  it("should throw when an unknown parameter is provided", async () => {
    const user = await userFactory.create();
    const dataset = await seedAvailableDataset();
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      configuration: validConfiguration,
    });

    await expect(() =>
      userRequestDatasetProcessingService.execute({
        user,
        params: {
          dataset_id: dataset.id,
          processor_id: processor.id,
          parameters: [
            { name: "alpha", value: "beta" },
            { name: "unknown_param", value: "x" },
          ],
        } as unknown as RequestDatasetProcessingSchema,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/UNKNOWN_PARAMETER",
      }),
    );
  });
});

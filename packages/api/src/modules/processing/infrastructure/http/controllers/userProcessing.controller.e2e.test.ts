import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";
import { PROCESSOR_PARAMETER_TYPE } from "@modules/processor/types/processorParameterType.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

const validProcessorConfiguration = {
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
};

describe("E2E: UserProcessingController", () => {
  beforeEach(context => {
    context.container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => fileFactory.create(),
      refreshFile: async ({ file }) => file,
      removeFileByPath: async () => "",
    });

    context.container.registerInstance<IJobProvider>("JobProvider", {
      initialization: Promise.resolve(),
      add: () => undefined,
      close: async () => undefined,
    });
  });

  const seedOwnedProcessing = async (params: { email: string }) => {
    const user = await userFactory.create({ email: params.email });
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const processing = await processingFactory.create(
      {
        visibility: PROCESSING_VISIBILITY.PRIVATE,
        status: PROCESSING_STATUS.PENDING,
      },
      { associations: { user, dataset, processor } },
    );

    return { user, dataset, processor, processing };
  };

  it("should list user processes", async context => {
    const { processing } = await seedOwnedProcessing({
      email: context.userSession.email,
    });

    const response = await context
      .userAuthorized(context.request.get("/processing"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: processing.id }),
        }),
      ]),
    );
  });

  it("should show a user processing", async context => {
    const { processing } = await seedOwnedProcessing({
      email: context.userSession.email,
    });

    const response = await context
      .userAuthorized(context.request.get(`/processing/${processing.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: processing.id });
  });

  it("should return an error showing a processing that was not found", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.get(`/processing/${faker.string.uuid()}`))
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@processing_guard/PROCESSING_NOT_FOUND",
    });
  });

  it("should create a user processing", async context => {
    const user = await userFactory.create({
      email: context.userSession.email,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      configuration: validProcessorConfiguration,
    });
    const file = await fileFactory.create({
      provider_status: FILE_PROVIDER_STATUS.READY,
      public_url: "https://example.com/file.csv",
      public_url_expires_at: faker.date.future(),
    });
    const dataset = await datasetFactory.create(
      {
        user_id: user.id,
        visibility: DATASET_VISIBILITY.PUBLIC,
      },
      { associations: { file } },
    );

    const response = await context
      .userAuthorized(context.request.post("/processing"))
      .send({
        processor_id: processor.id,
        dataset_id: dataset.id,
        parameters: [],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: PROCESSING_STATUS.PENDING,
      visibility: PROCESSING_VISIBILITY.PRIVATE,
    });
  });

  it("should delete a user processing", async context => {
    const { processing } = await seedOwnedProcessing({
      email: context.userSession.email,
    });

    const response = await context
      .userAuthorized(context.request.delete(`/processing/${processing.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: processing.id });
  });

  it("should return an error when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.get("/processing"))
      .set("Authorization", `Bearer someToken`)
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });
});

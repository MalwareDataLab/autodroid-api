import { gql } from "@/test/utils/gql.util";
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

describe("E2E: UserProcessingResolver", () => {
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

  const seedOwnedProcessing = async (params: {
    email: string;
    owned?: boolean;
    visibility?: PROCESSING_VISIBILITY;
    status?: PROCESSING_STATUS;
    started_at?: Date | null;
    finished_at?: Date | null;
  }) => {
    const user = await userFactory.create({ email: params.email });
    const owner = params.owned === false ? await userFactory.create() : user;
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const processing = await processingFactory.create(
      {
        visibility: params.visibility ?? PROCESSING_VISIBILITY.PRIVATE,
        status: params.status ?? PROCESSING_STATUS.PENDING,
        started_at: params.started_at ?? null,
        finished_at: params.finished_at ?? null,
      },
      { associations: { user: owner, dataset, processor } },
    );

    return { user, dataset, processor, processing };
  };

  it("should list user processes", async context => {
    const { processing } = await seedOwnedProcessing({
      email: context.userSession.email,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcesses {
            userProcesses {
              edges {
                node {
                  id
                }
              }
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcesses.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: processing.id }),
        }),
      ]),
    );
  });

  it("should exclude a private processing owned by another user from the list", async context => {
    await userFactory.create({ email: context.userSession.email });
    const { processing: otherPrivateProcessing } = await seedOwnedProcessing({
      email: faker.internet.email(),
      owned: false,
      visibility: PROCESSING_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcesses {
            userProcesses {
              edges {
                node {
                  id
                }
              }
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(
      response.body.data.userProcesses.edges.map((edge: any) => edge.node.id),
    ).not.toContain(otherPrivateProcessing.id);
  });

  it("should return an error listing processes filtered by a dataset that was not found", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcesses($dataset_id: String) {
            userProcesses(dataset_id: $dataset_id) {
              edges {
                node {
                  id
                }
              }
            }
          }
        `,
        variables: { dataset_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: { code: "@processing_guard/DATASET_NOT_FOUND" },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should return an error listing processes when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: gql`
          query UserProcesses {
            userProcesses {
              edges {
                node {
                  id
                }
              }
            }
          }
        `,
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "UNAUTHORIZED" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should show a user processing", async context => {
    const { processing } = await seedOwnedProcessing({
      email: context.userSession.email,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcessing($processing_id: String!) {
            userProcessing(processing_id: $processing_id) {
              id
              status
              visibility
            }
          }
        `,
        variables: { processing_id: processing.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcessing).toMatchObject({
      id: processing.id,
    });
  });

  it("should return an error showing a processing that was not found", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcessing($processing_id: String!) {
            userProcessing(processing_id: $processing_id) {
              id
            }
          }
        `,
        variables: { processing_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: { code: "@processing_guard/PROCESSING_NOT_FOUND" },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should return an error showing a private processing owned by another user", async context => {
    const { processing } = await seedOwnedProcessing({
      email: context.userSession.email,
      owned: false,
      visibility: PROCESSING_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcessing($processing_id: String!) {
            userProcessing(processing_id: $processing_id) {
              id
            }
          }
        `,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: { code: "@processing_guard/PROCESSOR_NOT_PUBLIC" },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should request a dataset processing", async context => {
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
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserRequestDatasetProcessing(
            $data: RequestDatasetProcessingSchema!
          ) {
            userRequestDatasetProcessing(data: $data) {
              id
              status
              visibility
            }
          }
        `,
        variables: {
          data: {
            processor_id: processor.id,
            dataset_id: dataset.id,
            parameters: [],
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userRequestDatasetProcessing).toMatchObject({
      status: PROCESSING_STATUS.PENDING,
      visibility: PROCESSING_VISIBILITY.PRIVATE,
    });
  });

  it("should return an error requesting a dataset processing when the dataset is not available", async context => {
    const user = await userFactory.create({
      email: context.userSession.email,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      configuration: validProcessorConfiguration,
    });
    const file = await fileFactory.create({
      provider_status: FILE_PROVIDER_STATUS.PENDING,
      public_url: null,
      public_url_expires_at: null,
    });
    const dataset = await datasetFactory.create(
      {
        user_id: user.id,
        visibility: DATASET_VISIBILITY.PUBLIC,
      },
      { associations: { file } },
    );

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserRequestDatasetProcessing(
            $data: RequestDatasetProcessingSchema!
          ) {
            userRequestDatasetProcessing(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            processor_id: processor.id,
            dataset_id: dataset.id,
            parameters: [],
          },
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@user_request_dataset_processing/DATASET_NOT_AVAILABLE",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should return an error requesting a dataset processing when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: gql`
          mutation UserRequestDatasetProcessing(
            $data: RequestDatasetProcessingSchema!
          ) {
            userRequestDatasetProcessing(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            processor_id: faker.string.uuid(),
            dataset_id: faker.string.uuid(),
            parameters: [],
          },
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "UNAUTHORIZED" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should update a processing visibility", async context => {
    const { processing } = await seedOwnedProcessing({
      email: context.userSession.email,
      visibility: PROCESSING_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserProcessingUpdateVisibility(
            $processing_id: String!
            $visibility: PROCESSING_VISIBILITY!
          ) {
            userProcessingUpdateVisibility(
              processing_id: $processing_id
              visibility: $visibility
            ) {
              id
              visibility
            }
          }
        `,
        variables: {
          processing_id: processing.id,
          visibility: "PUBLIC",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcessingUpdateVisibility).toMatchObject({
      id: processing.id,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    });
  });

  it("should return an error updating the visibility of a processing owned by another user", async context => {
    const { processing } = await seedOwnedProcessing({
      email: context.userSession.email,
      owned: false,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserProcessingUpdateVisibility(
            $processing_id: String!
            $visibility: PROCESSING_VISIBILITY!
          ) {
            userProcessingUpdateVisibility(
              processing_id: $processing_id
              visibility: $visibility
            ) {
              id
            }
          }
        `,
        variables: {
          processing_id: processing.id,
          visibility: "PRIVATE",
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@user_processing_update_visibility_service/CANNOT_UPDATE_PROCESSING_VISIBILITY",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should extend a processing keep until", async context => {
    const { processing } = await seedOwnedProcessing({
      email: context.userSession.email,
    });

    const keepUntil = faker.date.soon({ days: 10 });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserProcessingExtendKeepUntil(
            $processing_id: String!
            $keep_until: DateTimeISO!
          ) {
            userProcessingExtendKeepUntil(
              processing_id: $processing_id
              keep_until: $keep_until
            ) {
              id
            }
          }
        `,
        variables: {
          processing_id: processing.id,
          keep_until: keepUntil.toISOString(),
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcessingExtendKeepUntil).toMatchObject({
      id: processing.id,
    });
  });

  it("should return an error extending the keep until of a processing owned by another user", async context => {
    const { processing } = await seedOwnedProcessing({
      email: context.userSession.email,
      owned: false,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    });

    const keepUntil = faker.date.soon({ days: 10 });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserProcessingExtendKeepUntil(
            $processing_id: String!
            $keep_until: DateTimeISO!
          ) {
            userProcessingExtendKeepUntil(
              processing_id: $processing_id
              keep_until: $keep_until
            ) {
              id
            }
          }
        `,
        variables: {
          processing_id: processing.id,
          keep_until: keepUntil.toISOString(),
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@user_processing_extend_keep_until_service/CANNOT_EXTEND_PROCESSING_KEEP_UNTIL",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should delete a user processing", async context => {
    const { processing } = await seedOwnedProcessing({
      email: context.userSession.email,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserProcessingDelete($processing_id: String!) {
            userProcessingDelete(processing_id: $processing_id) {
              id
            }
          }
        `,
        variables: { processing_id: processing.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcessingDelete).toMatchObject({
      id: processing.id,
    });
  });

  it("should return an error deleting a processing owned by another user", async context => {
    const { processing } = await seedOwnedProcessing({
      email: context.userSession.email,
      owned: false,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserProcessingDelete($processing_id: String!) {
            userProcessingDelete(processing_id: $processing_id) {
              id
            }
          }
        `,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@user_processing_delete_service/CANNOT_DELETE_PROCESSING",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should get the processing time estimation", async context => {
    const user = await userFactory.create({
      email: context.userSession.email,
    });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcessingTimeEstimation(
            $dataset_id: String!
            $processor_id: String!
          ) {
            userProcessingTimeEstimation(
              dataset_id: $dataset_id
              processor_id: $processor_id
            ) {
              dataset_id
              processor_id
              estimated_execution_time
            }
          }
        `,
        variables: { dataset_id: dataset.id, processor_id: processor.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcessingTimeEstimation).toMatchObject({
      dataset_id: dataset.id,
      processor_id: processor.id,
    });
  });

  it("should return an error getting the time estimation for a dataset that was not found", async context => {
    const user = await userFactory.create({
      email: context.userSession.email,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcessingTimeEstimation(
            $dataset_id: String!
            $processor_id: String!
          ) {
            userProcessingTimeEstimation(
              dataset_id: $dataset_id
              processor_id: $processor_id
            ) {
              dataset_id
            }
          }
        `,
        variables: {
          dataset_id: faker.string.uuid(),
          processor_id: processor.id,
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: { code: "@processing_guard/DATASET_NOT_FOUND" },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
    expect(user).toBeDefined();
  });

  it("should get the processing estimated finish", async context => {
    const finished_at = faker.date.recent();
    const { processing, dataset, processor } = await seedOwnedProcessing({
      email: context.userSession.email,
      status: PROCESSING_STATUS.SUCCEEDED,
      started_at: faker.date.past({ refDate: finished_at }),
      finished_at,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcessingEstimatedFinish($processing_id: String!) {
            userProcessingEstimatedFinish(processing_id: $processing_id) {
              dataset_id
              processor_id
              processing_id
              estimated_start_time
              estimated_finish_time
            }
          }
        `,
        variables: { processing_id: processing.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcessingEstimatedFinish).toMatchObject({
      dataset_id: dataset.id,
      processor_id: processor.id,
      processing_id: processing.id,
    });
  });

  it("should return an error getting the estimated finish for a processing that was not found", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcessingEstimatedFinish($processing_id: String!) {
            userProcessingEstimatedFinish(processing_id: $processing_id) {
              processing_id
            }
          }
        `,
        variables: { processing_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: { code: "@processing_guard/PROCESSING_NOT_FOUND" },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });
});

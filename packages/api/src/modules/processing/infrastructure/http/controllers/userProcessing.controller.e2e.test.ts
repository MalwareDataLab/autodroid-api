import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";
import { PROCESSOR_PARAMETER_TYPE } from "@modules/processor/types/processorParameterType.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

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
  const seedOwnedProcessing = async (params: { email: string }) => {
    const user = await userFactory.create({ email: params.email });
    const datasetOwner = await userFactory.create();
    const dataset = await datasetFactory.create(
      { visibility: DATASET_VISIBILITY.PUBLIC },
      { associations: { user: datasetOwner } },
    );
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

  const seedOtherUserPublicProcessing = async () => {
    const otherUser = await userFactory.create();
    const otherUserPublicDataset = await datasetFactory.create(
      { visibility: DATASET_VISIBILITY.PUBLIC },
      { associations: { user: otherUser } },
    );
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const otherUserPublicProcessing = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PUBLIC },
      {
        associations: {
          user: otherUser,
          dataset: otherUserPublicDataset,
          processor,
        },
      },
    );

    return {
      otherUser,
      otherUserPublicDataset,
      otherUserPublicProcessing,
      processor,
    };
  };

  it("should return the owners only where the caller owns them when a user lists processes", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const {
      otherUser,
      otherUserPublicDataset,
      otherUserPublicProcessing,
      processor,
    } = await seedOtherUserPublicProcessing();
    const ownProcessingOfOtherUserDataset = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user, dataset: otherUserPublicDataset, processor } },
    );

    const response = await context
      .userAuthorized(context.request.get("/processing"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toHaveLength(2);
    expect(response.body.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({
            id: ownProcessingOfOtherUserDataset.id,
            user_id: user.id,
            user: expect.objectContaining({
              id: user.id,
              email: user.email,
              phone_number: user.phone_number,
            }),
            dataset: expect.objectContaining({
              user_id: otherUser.id,
              user: null,
            }),
          }),
        }),
        expect.objectContaining({
          node: expect.objectContaining({
            id: otherUserPublicProcessing.id,
            user_id: otherUser.id,
            user: null,
            dataset: expect.objectContaining({
              user_id: otherUser.id,
              user: null,
            }),
          }),
        }),
      ]),
    );
    expect(JSON.stringify(response.body)).not.toContain(otherUser.email);
  });

  const seedOwnProcesses = async (
    user: Awaited<ReturnType<typeof userFactory.create>>,
    startedAtByProcess: (Date | null)[],
  ) => {
    const dataset = await datasetFactory.create({}, { associations: { user } });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    return Promise.all(
      startedAtByProcess.map((started_at, index) =>
        processingFactory.create(
          {
            visibility: PROCESSING_VISIBILITY.PRIVATE,
            created_at: new Date(Date.UTC(2024, 0, index + 1)),
            started_at,
          },
          { associations: { user, dataset, processor } },
        ),
      ),
    );
  };

  it("should return only the requested page, in the requested order, when a user lists processes", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const processesOldestFirst = await seedOwnProcesses(user, [
      null,
      null,
      null,
    ]);

    const response = await context
      .userAuthorized(
        context.request.get("/processing").query({
          skip: 1,
          take: 1,
          sort: JSON.stringify([{ field: "created_at", order: "asc" }]),
        }),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body.totalCount).toBe(3);
    expect(response.body.edges).toHaveLength(1);
    expect(response.body.edges[0].node.id).toBe(processesOldestFirst[1].id);
    expect(response.body.pageInfo).toMatchObject({
      hasPreviousPage: true,
      hasNextPage: true,
    });
  });

  it("should read a boolean filter from the query string when a user lists processes", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const [, notStartedProcessing] = await seedOwnProcesses(user, [
      new Date(Date.UTC(2024, 0, 5)),
      null,
    ]);

    const response = await context
      .userAuthorized(
        context.request.get("/processing").query({ started: "false" }),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body.totalCount).toBe(1);
    expect(
      response.body.edges.map((edge: { node: { id: string } }) => edge.node.id),
    ).toEqual([notStartedProcessing.id]);
  });

  it("should not return the owners when a user shows another user's public processing", async context => {
    await userFactory.create({ email: context.userSession.email });
    const { otherUser, otherUserPublicProcessing } =
      await seedOtherUserPublicProcessing();

    const response = await context
      .userAuthorized(
        context.request.get(`/processing/${otherUserPublicProcessing.id}`),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: otherUserPublicProcessing.id,
      user_id: otherUser.id,
      user: null,
      dataset: { user_id: otherUser.id, user: null },
    });
    expect(JSON.stringify(response.body)).not.toContain(otherUser.email);
  });

  it("should return the full owners when an admin shows another user's public processing", async context => {
    await userFactory.create({ email: context.adminSession.email });
    const { otherUser, otherUserPublicProcessing } =
      await seedOtherUserPublicProcessing();

    const response = await context
      .adminAuthorized(
        context.request.get(`/processing/${otherUserPublicProcessing.id}`),
      )
      .send();

    const expectedOwner = {
      id: otherUser.id,
      email: otherUser.email,
      phone_number: otherUser.phone_number,
    };
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: otherUserPublicProcessing.id,
      user_id: otherUser.id,
      user: expectedOwner,
      dataset: { user_id: otherUser.id, user: expectedOwner },
    });
  });

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
    const datasetOwner = await userFactory.create();
    const dataset = await datasetFactory.create(
      { visibility: DATASET_VISIBILITY.PUBLIC },
      { associations: { file, user: datasetOwner } },
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
      user: { id: user.id },
      dataset: { id: dataset.id, user: null },
    });
  });

  it("should delete a user processing that has no stored files", async context => {
    const { processing, user, dataset } = await seedOwnedProcessing({
      email: context.userSession.email,
    });
    await context.repositories.ProcessingRepository.updateOne(
      { id: processing.id },
      { result_file_id: null, metrics_file_id: null },
    );

    const response = await context
      .userAuthorized(context.request.delete(`/processing/${processing.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: processing.id,
      user: { id: user.id },
      dataset: { id: dataset.id, user: null },
    });
    await expect(
      context.repositories.ProcessingRepository.findOne({ id: processing.id }),
    ).resolves.toBeNull();
  });
});

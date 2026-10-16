import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

// Util import
import { gql } from "@/test/utils/gql.util";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

describe("E2E: ProcessingFieldResolver", () => {
  const seed = async (params: { email: string }) => {
    const user = await userFactory.create(params);
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    await Promise.all(
      Array.from({ length: 10 }).map(() => {
        const finished_at = faker.date.past();
        return processingFactory.create(
          {
            started_at: faker.date.past({ refDate: finished_at }),
            finished_at,
            status: PROCESSING_STATUS.SUCCEEDED,
          },
          {
            associations: {
              dataset,
              processor,
            },
          },
        );
      }),
    );

    return {
      user,
      dataset,
      processor,
    };
  };

  it("should be able to get the estimated processing time", async context => {
    const { dataset, processor } = await seed({
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
                  estimated_finish {
                    dataset_id
                    processor_id
                    estimated_start_time
                    estimated_finish_time
                  }
                }
              }
            }
          }
        `,
      });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcesses.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({
            estimated_finish: {
              dataset_id: dataset.id,
              processor_id: processor.id,
              estimated_start_time: expect.any(String),
              estimated_finish_time: expect.any(String),
            },
          }),
        }),
      ]),
    );
  });

  it("should return a null estimated processing time when the estimation cannot be computed", async context => {
    await userFactory.create({ email: context.userSession.email });
    const otherUser = await userFactory.create();

    const dataset = await datasetFactory.create({
      user_id: otherUser.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const processing = await processingFactory.create(
      {
        status: PROCESSING_STATUS.PENDING,
        visibility: PROCESSING_VISIBILITY.PUBLIC,
      },
      { associations: { user: otherUser, dataset, processor } },
    );

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcesses {
            userProcesses {
              edges {
                node {
                  id
                  estimated_finish {
                    processing_id
                  }
                }
              }
            }
          }
        `,
      });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcesses.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: {
            id: processing.id,
            estimated_finish: null,
          },
        }),
      ]),
    );
  });

  const ownerFields = gql`
    fragment OwnerFields on User {
      id
      email
      name
      phone_number
      learning_data
      notifications_enabled
    }
  `;

  const expectedOwner = (user: User) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    phone_number: user.phone_number,
    learning_data: user.learning_data,
    notifications_enabled: user.notifications_enabled,
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

  it("should resolve the owners only where the caller owns them when a user lists processes", async context => {
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
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          ${ownerFields}
          query UserProcesses {
            userProcesses {
              edges {
                node {
                  id
                  user_id
                  user {
                    ...OwnerFields
                  }
                  dataset {
                    user_id
                    user {
                      ...OwnerFields
                    }
                  }
                }
              }
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcesses.edges).toHaveLength(2);
    expect(response.body.data.userProcesses.edges).toEqual(
      expect.arrayContaining([
        {
          node: {
            id: ownProcessingOfOtherUserDataset.id,
            user_id: user.id,
            user: expectedOwner(user),
            dataset: { user_id: otherUser.id, user: null },
          },
        },
        {
          node: {
            id: otherUserPublicProcessing.id,
            user_id: otherUser.id,
            user: null,
            dataset: { user_id: otherUser.id, user: null },
          },
        },
      ]),
    );
    expect(JSON.stringify(response.body)).not.toContain(otherUser.email);
  });

  it("should not resolve the owners when a user shows another user's public processing", async context => {
    await userFactory.create({ email: context.userSession.email });
    const { otherUser, otherUserPublicProcessing } =
      await seedOtherUserPublicProcessing();

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          ${ownerFields}
          query UserProcessing($processing_id: String!) {
            userProcessing(processing_id: $processing_id) {
              id
              user_id
              user {
                ...OwnerFields
              }
              dataset {
                user_id
                user {
                  ...OwnerFields
                }
              }
            }
          }
        `,
        variables: { processing_id: otherUserPublicProcessing.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcessing).toEqual({
      id: otherUserPublicProcessing.id,
      user_id: otherUser.id,
      user: null,
      dataset: { user_id: otherUser.id, user: null },
    });
  });

  it("should resolve the full owners when an admin shows another user's public processing", async context => {
    await userFactory.create({ email: context.adminSession.email });
    const { otherUser, otherUserPublicProcessing } =
      await seedOtherUserPublicProcessing();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          ${ownerFields}
          query UserProcessing($processing_id: String!) {
            userProcessing(processing_id: $processing_id) {
              id
              user_id
              user {
                ...OwnerFields
              }
              dataset {
                user_id
                user {
                  ...OwnerFields
                }
              }
            }
          }
        `,
        variables: { processing_id: otherUserPublicProcessing.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcessing).toEqual({
      id: otherUserPublicProcessing.id,
      user_id: otherUser.id,
      user: expectedOwner(otherUser),
      dataset: { user_id: otherUser.id, user: expectedOwner(otherUser) },
    });
  });
});

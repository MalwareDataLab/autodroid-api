import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

// Util import
import { gql } from "@/test/utils/gql.util";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

describe("E2E: UserDatasetFieldResolver", () => {
  it("should resolve the processes field of a dataset", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const processing = await processingFactory.create(
      { status: PROCESSING_STATUS.SUCCEEDED },
      { associations: { user, dataset, processor } },
    );

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserDataset($dataset_id: String!) {
            userDataset(dataset_id: $dataset_id) {
              id
              processes {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        `,
        variables: { dataset_id: dataset.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDataset.processes.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: processing.id }),
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

  it("should resolve the owner only on the caller's own datasets when a user lists datasets", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const otherUser = await userFactory.create();
    const ownDataset = await datasetFactory.create(
      { visibility: DATASET_VISIBILITY.PRIVATE },
      { associations: { user } },
    );
    const otherUserPublicDataset = await datasetFactory.create(
      { visibility: DATASET_VISIBILITY.PUBLIC },
      { associations: { user: otherUser } },
    );

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          ${ownerFields}
          query UserDatasets {
            userDatasets {
              edges {
                node {
                  id
                  user_id
                  user {
                    ...OwnerFields
                  }
                }
              }
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDatasets.edges).toHaveLength(2);
    expect(response.body.data.userDatasets.edges).toEqual(
      expect.arrayContaining([
        {
          node: {
            id: ownDataset.id,
            user_id: user.id,
            user: expectedOwner(user),
          },
        },
        {
          node: {
            id: otherUserPublicDataset.id,
            user_id: otherUser.id,
            user: null,
          },
        },
      ]),
    );
    expect(JSON.stringify(response.body)).not.toContain(otherUser.email);
  });

  it("should not resolve the owner when a user shows another user's public dataset", async context => {
    await userFactory.create({ email: context.userSession.email });
    const otherUser = await userFactory.create();
    const otherUserPublicDataset = await datasetFactory.create(
      { visibility: DATASET_VISIBILITY.PUBLIC },
      { associations: { user: otherUser } },
    );

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          ${ownerFields}
          query UserDataset($dataset_id: String!) {
            userDataset(dataset_id: $dataset_id) {
              id
              user_id
              user {
                ...OwnerFields
              }
            }
          }
        `,
        variables: { dataset_id: otherUserPublicDataset.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDataset).toEqual({
      id: otherUserPublicDataset.id,
      user_id: otherUser.id,
      user: null,
    });
  });

  it("should resolve the full owner when an admin shows another user's public dataset", async context => {
    await userFactory.create({ email: context.adminSession.email });
    const otherUser = await userFactory.create();
    const otherUserPublicDataset = await datasetFactory.create(
      { visibility: DATASET_VISIBILITY.PUBLIC },
      { associations: { user: otherUser } },
    );

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          ${ownerFields}
          query UserDataset($dataset_id: String!) {
            userDataset(dataset_id: $dataset_id) {
              id
              user_id
              user {
                ...OwnerFields
              }
            }
          }
        `,
        variables: { dataset_id: otherUserPublicDataset.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDataset).toEqual({
      id: otherUserPublicDataset.id,
      user_id: otherUser.id,
      user: expectedOwner(otherUser),
    });
  });

  it("should return an error resolving processes when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: gql`
          query UserDataset($dataset_id: String!) {
            userDataset(dataset_id: $dataset_id) {
              id
              processes {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        `,
        variables: { dataset_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "UNAUTHORIZED" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });
});

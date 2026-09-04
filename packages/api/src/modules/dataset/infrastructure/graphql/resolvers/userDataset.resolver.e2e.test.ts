import { gql } from "@/test/utils/gql.util";
import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import { createHash } from "node:crypto";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

const md5 = () =>
  createHash("md5").update(faker.string.alphanumeric(10)).digest("hex");

describe("E2E: UserDatasetResolver", () => {
  beforeEach(context => {
    context.container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => fileFactory.create(),
      refreshFile: async ({ file }) => file,
      removeFileByPath: async () => "",
    });
  });

  it("should list user datasets", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserDatasets {
            userDatasets {
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
    expect(response.body.data.userDatasets.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: dataset.id }),
        }),
      ]),
    );
  });

  it("should reject cursor first without after", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserDatasets($first: Int) {
            userDatasets(first: $first) {
              edges {
                node {
                  id
                }
              }
            }
          }
        `,
        variables: { first: 10 },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Argument Validation Error",
          extensions: expect.objectContaining({
            code: "GRAPHQL_VALIDATION_FAILED",
            validationErrors: expect.arrayContaining([
              expect.objectContaining({
                constraints: expect.objectContaining({
                  OnlyWithConstraint: "first needs to be used with after",
                }),
              }),
            ]),
          }),
        }),
      ]),
    );
  });

  it("should return an error listing user datasets when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: gql`
          query UserDatasets {
            userDatasets {
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

  it("should show a user dataset", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserDataset($dataset_id: String!) {
            userDataset(dataset_id: $dataset_id) {
              id
              visibility
            }
          }
        `,
        variables: { dataset_id: dataset.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDataset).toMatchObject({
      id: dataset.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });
  });

  it("should return an error showing a dataset that was not found", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserDataset($dataset_id: String!) {
            userDataset(dataset_id: $dataset_id) {
              id
            }
          }
        `,
        variables: { dataset_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: { code: "@dataset_guard/DATASET_NOT_FOUND" },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should return an error showing a private dataset owned by another user", async context => {
    await userFactory.create({ email: context.userSession.email });
    const otherUser = await userFactory.create();
    const dataset = await datasetFactory.create({
      user_id: otherUser.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserDataset($dataset_id: String!) {
            userDataset(dataset_id: $dataset_id) {
              id
            }
          }
        `,
        variables: { dataset_id: dataset.id },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: { code: "@dataset_guard/DATASET_NOT_PUBLIC" },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should return an error showing a dataset when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: gql`
          query UserDataset($dataset_id: String!) {
            userDataset(dataset_id: $dataset_id) {
              id
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

  it("should create a user dataset", async context => {
    await userFactory.create({ email: context.userSession.email });
    await processorFactory.create({ allowed_mime_types: MIME_TYPE.PNG });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserDatasetCreate($data: UserDatasetCreateSchema!) {
            userDatasetCreate(data: $data) {
              id
              visibility
              description
              tags
            }
          }
        `,
        variables: {
          data: {
            filename: faker.system.fileName(),
            mime_type: "PNG",
            size: 1024,
            md5_hash: md5(),
            description: "A dataset",
            tags: "one,two,three",
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDatasetCreate).toMatchObject({
      visibility: DATASET_VISIBILITY.PRIVATE,
      description: "A dataset",
      tags: "one,two,three",
    });
  });

  it("should return an error creating a dataset with a mime type not accepted by any processor", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserDatasetCreate($data: UserDatasetCreateSchema!) {
            userDatasetCreate(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            filename: faker.system.fileName(),
            mime_type: "PNG",
            size: 1024,
            md5_hash: md5(),
          },
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@user_dataset_create_service/MIME_TYPE_NOT_ACCEPTED_BY_ANY_PROCESSOR",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should return an error creating a dataset with invalid tags", async context => {
    await userFactory.create({ email: context.userSession.email });
    await processorFactory.create({ allowed_mime_types: MIME_TYPE.PNG });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserDatasetCreate($data: UserDatasetCreateSchema!) {
            userDatasetCreate(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            filename: faker.system.fileName(),
            mime_type: "PNG",
            size: 1024,
            md5_hash: md5(),
            tags: "one,two,",
          },
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@user_dataset_create_service/TAGS_NOT_PROVIDED",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should return an error creating a dataset when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: gql`
          mutation UserDatasetCreate($data: UserDatasetCreateSchema!) {
            userDatasetCreate(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            filename: faker.system.fileName(),
            mime_type: "PNG",
            size: 1024,
            md5_hash: md5(),
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

  it("should update a user dataset", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserDatasetUpdate(
            $dataset_id: String!
            $data: UserDatasetUpdateSchema!
          ) {
            userDatasetUpdate(dataset_id: $dataset_id, data: $data) {
              id
              description
              tags
            }
          }
        `,
        variables: {
          dataset_id: dataset.id,
          data: { description: "Updated", tags: "a,b,c" },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDatasetUpdate).toMatchObject({
      id: dataset.id,
      description: "Updated",
      tags: "a,b,c",
    });
  });

  it("should return an error updating a dataset that is not editable", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserDatasetUpdate(
            $dataset_id: String!
            $data: UserDatasetUpdateSchema!
          ) {
            userDatasetUpdate(dataset_id: $dataset_id, data: $data) {
              id
            }
          }
        `,
        variables: {
          dataset_id: dataset.id,
          data: { description: "Updated" },
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@user_dataset_update_service/DATASET_NOT_EDITABLE",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should return an error updating a dataset when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: gql`
          mutation UserDatasetUpdate(
            $dataset_id: String!
            $data: UserDatasetUpdateSchema!
          ) {
            userDatasetUpdate(dataset_id: $dataset_id, data: $data) {
              id
            }
          }
        `,
        variables: {
          dataset_id: faker.string.uuid(),
          data: { description: "Updated" },
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "UNAUTHORIZED" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should delete a user dataset", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserDatasetDelete($dataset_id: String!) {
            userDatasetDelete(dataset_id: $dataset_id) {
              id
            }
          }
        `,
        variables: { dataset_id: dataset.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDatasetDelete).toMatchObject({
      id: dataset.id,
    });
  });

  it("should return an error deleting a dataset that is not editable", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserDatasetDelete($dataset_id: String!) {
            userDatasetDelete(dataset_id: $dataset_id) {
              id
            }
          }
        `,
        variables: { dataset_id: dataset.id },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@user_dataset_delete_service/DATASET_NOT_EDITABLE",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should return an error deleting a dataset when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: gql`
          mutation UserDatasetDelete($dataset_id: String!) {
            userDatasetDelete(dataset_id: $dataset_id) {
              id
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

  it("should request publication of a user dataset", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserDatasetRequestPublication($dataset_id: String!) {
            userDatasetRequestPublication(dataset_id: $dataset_id) {
              id
              visibility
            }
          }
        `,
        variables: { dataset_id: dataset.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDatasetRequestPublication).toMatchObject({
      id: dataset.id,
      visibility: DATASET_VISIBILITY.UNDER_REVIEW,
    });
  });

  it("should return an error requesting publication of a dataset that is not editable", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserDatasetRequestPublication($dataset_id: String!) {
            userDatasetRequestPublication(dataset_id: $dataset_id) {
              id
            }
          }
        `,
        variables: { dataset_id: dataset.id },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@user_dataset_request_publication_service/DATASET_NOT_EDITABLE",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should return an error requesting publication when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: gql`
          mutation UserDatasetRequestPublication($dataset_id: String!) {
            userDatasetRequestPublication(dataset_id: $dataset_id) {
              id
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

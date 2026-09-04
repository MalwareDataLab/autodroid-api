import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { gql } from "@/test/utils/gql.util";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

describe("E2E: AdminDatasetResolver", () => {
  beforeEach(context => {
    context.container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => fileFactory.create(),
      refreshFile: async ({ file }) => file,
      removeFileByPath: async () => "",
    });
  });

  it("should list datasets for an admin", async context => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminDatasets {
            adminDatasets {
              edges {
                node {
                  id
                }
              }
              totalCount
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminDatasets.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: dataset.id }),
        }),
      ]),
    );
  });

  it("should forbid listing datasets for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminDatasets {
            adminDatasets {
              totalCount
            }
          }
        `,
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "FORBIDDEN" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should fail listing datasets when unauthenticated", async context => {
    const response = await context.request.post("/graphql").send({
      query: gql`
        query AdminDatasets {
          adminDatasets {
            totalCount
          }
        }
      `,
    });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "FORBIDDEN" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should show a dataset for an admin", async context => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminDataset($dataset_id: String!) {
            adminDataset(dataset_id: $dataset_id) {
              id
              visibility
            }
          }
        `,
        variables: { dataset_id: dataset.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminDataset).toMatchObject({
      id: dataset.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });
  });

  it("should fail showing a dataset that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminDataset($dataset_id: String!) {
            adminDataset(dataset_id: $dataset_id) {
              id
            }
          }
        `,
        variables: { dataset_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: { code: "@admin_dataset_show_service/DATASET_NOT_FOUND" },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should update a dataset for an admin", async context => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminDatasetUpdate(
            $dataset_id: String!
            $data: AdminDatasetUpdateSchema!
          ) {
            adminDatasetUpdate(dataset_id: $dataset_id, data: $data) {
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
    expect(response.body.data.adminDatasetUpdate).toMatchObject({
      id: dataset.id,
      description: "Updated",
      tags: "a,b,c",
    });
  });

  it("should fail updating a dataset with invalid tags", async context => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminDatasetUpdate(
            $dataset_id: String!
            $data: AdminDatasetUpdateSchema!
          ) {
            adminDatasetUpdate(dataset_id: $dataset_id, data: $data) {
              id
            }
          }
        `,
        variables: {
          dataset_id: dataset.id,
          data: { tags: "a,b," },
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: { code: "@dataset_create_service/TAGS_NOT_PROVIDED" },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should fail updating a dataset that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminDatasetUpdate(
            $dataset_id: String!
            $data: AdminDatasetUpdateSchema!
          ) {
            adminDatasetUpdate(dataset_id: $dataset_id, data: $data) {
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
        expect.objectContaining({
          extensions: {
            code: "@admin_dataset_update_service/DATASET_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should update a dataset visibility for an admin", async context => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminDatasetUpdateVisibility(
            $dataset_id: String!
            $data: AdminDatasetUpdateVisibilitySchema!
          ) {
            adminDatasetUpdateVisibility(dataset_id: $dataset_id, data: $data) {
              id
              visibility
            }
          }
        `,
        variables: {
          dataset_id: dataset.id,
          data: { visibility: "PUBLIC" },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminDatasetUpdateVisibility).toMatchObject({
      id: dataset.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
  });

  it("should fail updating visibility of a dataset that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminDatasetUpdateVisibility(
            $dataset_id: String!
            $data: AdminDatasetUpdateVisibilitySchema!
          ) {
            adminDatasetUpdateVisibility(dataset_id: $dataset_id, data: $data) {
              id
            }
          }
        `,
        variables: {
          dataset_id: faker.string.uuid(),
          data: { visibility: "PUBLIC" },
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_dataset_update_visibility_service/DATASET_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should delete a dataset for an admin", async context => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminDatasetDelete($dataset_id: String!) {
            adminDatasetDelete(dataset_id: $dataset_id) {
              id
            }
          }
        `,
        variables: { dataset_id: dataset.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminDatasetDelete).toMatchObject({
      id: dataset.id,
    });
  });

  it("should fail deleting a dataset that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminDatasetDelete($dataset_id: String!) {
            adminDatasetDelete(dataset_id: $dataset_id) {
              id
            }
          }
        `,
        variables: { dataset_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_dataset_delete_service/DATASET_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });
});

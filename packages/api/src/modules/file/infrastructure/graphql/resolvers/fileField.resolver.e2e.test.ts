import { gql } from "@/test/utils/gql.util";
import { beforeEach, describe, expect, it } from "vitest";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

describe("E2E: FileFieldResolver", () => {
  beforeEach(context => {
    context.container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => fileFactory.create(),
      refreshFile: async ({ file }) => file,
      removeFileByPath: async () => "",
    });
  });

  it("should resolve the public_url field of a dataset file", async context => {
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
              file {
                id
                public_url
              }
            }
          }
        `,
        variables: { dataset_id: dataset.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDataset.file).toMatchObject({
      id: expect.any(String),
    });
    // The seeded file has no allow_public_access/upload_url, so the service
    // (processFilePublicAccess.service.ts) deterministically leaves it null
    // rather than minting a URL — proves the real value, not just the key.
    expect(response.body.data.userDataset.file.public_url).toBeNull();
  });
});

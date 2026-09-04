import { beforeEach, describe, expect, it } from "vitest";

// Util import
import { gql } from "@/test/utils/gql.util";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";

describe("E2E: AdminFileResolver", () => {
  beforeEach(context => {
    context.container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => fileFactory.create(),
      refreshFile: async ({ file }) => file,
      removeFileByPath: async () => "",
    });
  });

  it("should remove all dangling files for an admin", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminFileRemoveAllDangling {
            adminFileRemoveAllDangling
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(typeof response.body.data.adminFileRemoveAllDangling).toBe("number");
  });

  it("should forbid removing all dangling files for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminFileRemoveAllDangling {
            adminFileRemoveAllDangling
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
});

import { beforeEach, describe, expect, it } from "vitest";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";

describe("E2E: AdminProcessingCleanExpiredController", () => {
  beforeEach(context => {
    context.container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => fileFactory.create(),
      refreshFile: async ({ file }) => file,
      removeFileByPath: async () => "",
    });
  });

  it("should clean expired processes for an admin", async context => {
    const response = await context
      .adminAuthorized(
        context.request.delete("/admin/processing/clean-expired"),
      )
      .send();

    expect(response.status).toBe(200);
  });

  it("should fail cleaning expired processes for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.delete("/admin/processing/clean-expired"))
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@admin_auth_middleware/NOT_AN_ADMIN",
    });
  });
});

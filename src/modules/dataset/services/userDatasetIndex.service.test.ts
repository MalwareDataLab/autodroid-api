import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Repository import
import { IDatasetRepository } from "@shared/container/repositories";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "../entities/factories/dataset.factory";

// Service import
import { UserDatasetIndexService } from "./userDatasetIndex.service";

describe("Service: UserDatasetIndexService", () => {
  let user: User;
  let datasetRepository: IDatasetRepository;

  let userDatasetIndexService: UserDatasetIndexService;

  beforeEach(async () => {
    container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: vi.fn(() => {
        throw new Error("Not implemented.");
      }),
      refreshFile: vi.fn(),
      removeFileByPath: vi.fn(),
    });

    datasetRepository = container.resolve("DatasetRepository");

    user = await userFactory.create();

    userDatasetIndexService = new UserDatasetIndexService(datasetRepository);
  });

  it("should list public datasets", async () => {
    const adminUser = await userFactory.create();
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
      user_id: adminUser.id,
    });

    const response = await userDatasetIndexService.execute({
      user,
    });

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining(dataset),
          }),
        ]),
      }),
    );
  });

  it("should list private datasets owned by current user", async () => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
    });

    const response = await userDatasetIndexService.execute({
      user,
    });

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining(dataset),
          }),
        ]),
      }),
    );
  });

  it("should not list private datasets when not admin and dataset is not owned by current user", async () => {
    const adminUser = await userFactory.create();
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: adminUser.id,
    });

    const response = await userDatasetIndexService.execute({
      user,
    });

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.not.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining(dataset),
          }),
        ]),
      }),
    );
  });
});

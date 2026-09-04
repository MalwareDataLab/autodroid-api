import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Repository import
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

// Service import
import { AdminDatasetUpdateVisibilityService } from "./adminDatasetUpdateVisibility.service";

describe("Service: AdminDatasetUpdateVisibilityService", () => {
  let datasetRepositoryMock: Mocked<IDatasetRepository>;

  let adminDatasetUpdateVisibilityService: AdminDatasetUpdateVisibilityService;

  beforeEach(() => {
    datasetRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    adminDatasetUpdateVisibilityService =
      new AdminDatasetUpdateVisibilityService(datasetRepositoryMock);
  });

  it("should update the dataset visibility", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const dataset = datasetFactory.build();
    const updatedDataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    datasetRepositoryMock.updateOne.mockResolvedValueOnce(updatedDataset);

    const response = await adminDatasetUpdateVisibilityService.execute({
      dataset_id: dataset.id,
      data: { visibility: DATASET_VISIBILITY.PUBLIC },
      user,
      language: "en",
    });

    expect(response).toMatchObject(updatedDataset);
  });

  it("should throw if the dataset was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminDatasetUpdateVisibilityService.execute({
        dataset_id: faker.string.uuid(),
        data: { visibility: DATASET_VISIBILITY.PUBLIC },
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_dataset_update_visibility_service/DATASET_NOT_FOUND",
      }),
    );
  });

  it("should throw if the dataset was not updated", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const dataset = datasetFactory.build();

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    datasetRepositoryMock.updateOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminDatasetUpdateVisibilityService.execute({
        dataset_id: dataset.id,
        data: { visibility: DATASET_VISIBILITY.PUBLIC },
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_dataset_update_visibility_service/DATASET_NOT_UPDATED",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminDatasetUpdateVisibilityService.execute({
        dataset_id: faker.string.uuid(),
        data: { visibility: DATASET_VISIBILITY.PUBLIC },
        user,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});

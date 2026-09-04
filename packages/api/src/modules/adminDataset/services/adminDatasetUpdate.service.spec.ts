import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Repository import
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

// Schema import
import { AdminDatasetUpdateSchema } from "../schemas/adminDataset.schema";

// Service import
import { AdminDatasetUpdateService } from "./adminDatasetUpdate.service";

describe("Service: AdminDatasetUpdateService", () => {
  let datasetRepositoryMock: Mocked<IDatasetRepository>;

  let adminDatasetUpdateService: AdminDatasetUpdateService;

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

    adminDatasetUpdateService = new AdminDatasetUpdateService(
      datasetRepositoryMock,
    );
  });

  it("should update a dataset with description and tags", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const dataset = datasetFactory.build();
    const data: AdminDatasetUpdateSchema = {
      description: "  Updated description  ",
      tags: " one , two , three ",
    };
    const updatedDataset = datasetFactory.build();

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    datasetRepositoryMock.updateOne.mockResolvedValueOnce(updatedDataset);

    const response = await adminDatasetUpdateService.execute({
      dataset_id: dataset.id,
      data,
      user,
      language: "en",
    });

    expect(response).toMatchObject(updatedDataset);
    expect(datasetRepositoryMock.updateOne).toHaveBeenCalledWith(
      { id: dataset.id },
      { description: "Updated description", tags: "one,two,three" },
    );
  });

  it("should update a dataset with null description and tags", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const dataset = datasetFactory.build();
    const data: AdminDatasetUpdateSchema = {
      description: null,
      tags: null,
    };
    const updatedDataset = datasetFactory.build();

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    datasetRepositoryMock.updateOne.mockResolvedValueOnce(updatedDataset);

    const response = await adminDatasetUpdateService.execute({
      dataset_id: dataset.id,
      data,
      user,
      language: "en",
    });

    expect(response).toMatchObject(updatedDataset);
    expect(datasetRepositoryMock.updateOne).toHaveBeenCalledWith(
      { id: dataset.id },
      { description: null, tags: null },
    );
  });

  it("should throw if the dataset was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminDatasetUpdateService.execute({
        dataset_id: faker.string.uuid(),
        data: { description: null, tags: null },
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_dataset_update_service/DATASET_NOT_FOUND",
      }),
    );
  });

  it("should throw if the description is invalid", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const dataset = datasetFactory.build();

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    await expect(() =>
      adminDatasetUpdateService.execute({
        dataset_id: dataset.id,
        data: {
          description: 123 as unknown as string,
          tags: null,
        },
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_create_service/INVALID_DESCRIPTION",
      }),
    );
  });

  it("should throw if the tags are invalid", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const dataset = datasetFactory.build();

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    await expect(() =>
      adminDatasetUpdateService.execute({
        dataset_id: dataset.id,
        data: {
          description: "Updated description",
          tags: "one,two,three,",
        },
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_create_service/TAGS_NOT_PROVIDED",
      }),
    );
  });

  it("should throw if the dataset was not updated", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const dataset = datasetFactory.build();

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    datasetRepositoryMock.updateOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminDatasetUpdateService.execute({
        dataset_id: dataset.id,
        data: { description: null, tags: null },
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_dataset_update_service/DATASET_NOT_UPDATED",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminDatasetUpdateService.execute({
        dataset_id: faker.string.uuid(),
        data: { description: null, tags: null },
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

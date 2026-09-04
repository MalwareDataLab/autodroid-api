import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Repository import
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

// Service import
import { AdminDatasetShowService } from "./adminDatasetShow.service";

describe("Service: AdminDatasetShowService", () => {
  let datasetRepositoryMock: Mocked<IDatasetRepository>;

  let adminDatasetShowService: AdminDatasetShowService;

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

    adminDatasetShowService = new AdminDatasetShowService(
      datasetRepositoryMock,
    );
  });

  it("should show a dataset", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const dataset = datasetFactory.build(
      {},
      { transient: { withRelations: true } },
    );

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    const response = await adminDatasetShowService.execute({
      dataset_id: dataset.id,
      user,
      language: "en",
    });

    expect(response).toMatchObject(dataset);
  });

  it("should throw if the dataset was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminDatasetShowService.execute({
        dataset_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_dataset_show_service/DATASET_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminDatasetShowService.execute({
        dataset_id: faker.string.uuid(),
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

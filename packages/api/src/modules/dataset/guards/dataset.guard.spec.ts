import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Repository import
import { IDatasetRepository } from "@shared/container/repositories";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Guard import
import { DatasetGuard } from "./dataset.guard";

describe("Guard: DatasetGuard", () => {
  let datasetRepositoryMock: Mocked<IDatasetRepository>;

  let datasetGuard: DatasetGuard;

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

    datasetGuard = new DatasetGuard(datasetRepositoryMock);
  });

  it("should throw if the dataset was not found", async () => {
    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      datasetGuard.execute({
        user: userFactory.build(),
        dataset_id: faker.string.uuid(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@dataset_guard/DATASET_NOT_FOUND" }),
    );
  });

  it("should return the dataset for an admin regardless of visibility", async () => {
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: faker.string.uuid(),
    });
    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    const response = await datasetGuard.execute({
      user: { id: faker.string.uuid(), is_admin: true } as User,
      dataset_id: dataset.id,
      language: "en",
    });

    expect(response.dataset).toBe(dataset);
    expect(response.t).toBeTypeOf("function");
  });

  it("should return the dataset when it is public", async () => {
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PUBLIC,
      user_id: faker.string.uuid(),
    });
    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    const response = await datasetGuard.execute({
      user: { id: faker.string.uuid(), is_admin: false } as User,
      dataset_id: dataset.id,
      language: "en",
    });

    expect(response.dataset).toBe(dataset);
  });

  it("should return the dataset when the requester is the owner", async () => {
    const user = { id: faker.string.uuid(), is_admin: false } as User;
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
    });
    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    const response = await datasetGuard.execute({
      user,
      dataset_id: dataset.id,
      language: "en",
    });

    expect(response.dataset).toBe(dataset);
  });

  it("should throw if a non-admin requests a private dataset they do not own", async () => {
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: faker.string.uuid(),
    });
    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    await expect(() =>
      datasetGuard.execute({
        user: { id: faker.string.uuid(), is_admin: false } as User,
        dataset_id: dataset.id,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@dataset_guard/DATASET_NOT_PUBLIC" }),
    );
  });
});

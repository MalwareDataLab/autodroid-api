import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Dataset } from "../entities/dataset.entity";

// Enum import
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

// Repository import
import { IDatasetRepository } from "../repositories/IDataset.repository";

// Service import
import { UserDatasetUpdateService } from "./userDatasetUpdate.service";

describe("Service: UserDatasetUpdateService", () => {
  let datasetRepositoryMock: Mocked<IDatasetRepository>;

  let userDatasetUpdateService: UserDatasetUpdateService;

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

    userDatasetUpdateService = new UserDatasetUpdateService(
      datasetRepositoryMock,
    );
  });

  it("should update a dataset", async () => {
    const data = {
      description: "Updated description",
      tags: "updated,tags,one,two,three",
    };

    const dataset_id = faker.string.uuid();

    const dataset: Dataset = parse(Dataset, {
      id: faker.string.uuid(),
      description: faker.word.words(3),
      tags: "one,two,three",
      user_id: faker.string.uuid(),
      visibility: DATASET_VISIBILITY.PRIVATE,
      updated_at: new Date(),
    } satisfies Partial<Dataset>);

    const expected = {
      ...dataset,
      ...data,
    };

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    datasetRepositoryMock.updateOne.mockResolvedValueOnce(expected);

    const response = await userDatasetUpdateService.execute({
      dataset_id,
      data,
      user: {
        id: dataset.user_id,
      } as User,
      language: "en",
    });

    expect(response).toMatchObject(expected);
  });

  it("should update a dataset with null description and tags", async () => {
    const data = {
      description: null,
      tags: null,
    };

    const dataset_id = faker.string.uuid();

    const dataset: Dataset = parse(Dataset, {
      id: faker.string.uuid(),
      description: faker.word.words(3),
      tags: "one,two,three",
      user_id: faker.string.uuid(),
      visibility: DATASET_VISIBILITY.PRIVATE,
      updated_at: new Date(),
    } satisfies Partial<Dataset>);

    const expected = {
      ...dataset,
      ...data,
    };

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    datasetRepositoryMock.updateOne.mockResolvedValueOnce(expected);

    const response = await userDatasetUpdateService.execute({
      dataset_id,
      data,
      user: {
        id: dataset.user_id,
      } as User,
      language: "en",
    });

    expect(response).toMatchObject(expected);
  });

  it("should throw if the dataset was not found after update", async () => {
    const data = {
      description: null,
      tags: null,
    };

    const dataset_id = faker.string.uuid();

    const dataset: Dataset = parse(Dataset, {
      id: faker.string.uuid(),
      description: faker.word.words(3),
      tags: "one,two,three",
      user_id: faker.string.uuid(),
      visibility: DATASET_VISIBILITY.PRIVATE,
      updated_at: new Date(),
    } satisfies Partial<Dataset>);

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    datasetRepositoryMock.updateOne.mockResolvedValueOnce(null);

    await expect(() =>
      userDatasetUpdateService.execute({
        dataset_id,
        data,
        user: {
          id: dataset.user_id,
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_update_service/DATASET_NOT_UPDATED",
      }),
    );
  });

  it("should throw if the tags are invalid", async () => {
    const data = {
      description: "Updated description",
      tags: "updated,tags,one,two,three,",
    };

    const dataset_id = faker.string.uuid();

    const dataset: Dataset = parse(Dataset, {
      id: faker.string.uuid(),
      description: faker.word.words(3),
      tags: "one,two,three",
      user_id: faker.string.uuid(),
      visibility: DATASET_VISIBILITY.PRIVATE,
      updated_at: new Date(),
    } satisfies Partial<Dataset>);

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    await expect(() =>
      userDatasetUpdateService.execute({
        dataset_id,
        data,
        user: {
          id: dataset.user_id,
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_create_service/TAGS_NOT_PROVIDED",
      }),
    );
  });

  it("should throw if the description is invalid", async () => {
    const data = {
      description: 123 as unknown as string,
      tags: "updated,tags,one,two,three,",
    };

    const dataset_id = faker.string.uuid();

    const dataset: Dataset = parse(Dataset, {
      id: faker.string.uuid(),
      description: faker.word.words(3),
      tags: "one,two,three",
      user_id: faker.string.uuid(),
      visibility: DATASET_VISIBILITY.PRIVATE,
      updated_at: new Date(),
    } satisfies Partial<Dataset>);

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    await expect(() =>
      userDatasetUpdateService.execute({
        dataset_id,
        data,
        user: {
          id: dataset.user_id,
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_create_service/INVALID_DESCRIPTION",
      }),
    );
  });

  it("should throw if the dataset is not editable", async () => {
    const data = {
      description: 123 as unknown as string,
      tags: "updated,tags,one,two,three,",
    };

    const dataset_id = faker.string.uuid();

    const dataset: Dataset = parse(Dataset, {
      id: faker.string.uuid(),
      description: faker.word.words(3),
      tags: "one,two,three",
      user_id: faker.string.uuid(),
      public_status: 1,
      deleted_at: new Date(),
      updated_at: new Date(),
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    await expect(() =>
      userDatasetUpdateService.execute({
        dataset_id,
        data,
        user: {
          id: dataset.user_id,
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_update_service/DATASET_NOT_EDITABLE",
      }),
    );
  });

  it("should throw if the dataset was not found", async () => {
    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      userDatasetUpdateService.execute({
        dataset_id: faker.string.uuid(),
        data: {
          description: faker.word.words(3),
          tags: faker.word.words(1),
        },
        user: {
          id: faker.string.uuid(),
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_guard/DATASET_NOT_FOUND",
      }),
    );
  });
});

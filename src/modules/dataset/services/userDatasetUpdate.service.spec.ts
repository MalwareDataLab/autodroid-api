import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

import { parse } from "@shared/utils/instanceParser";
import { faker } from "@faker-js/faker";
import { AppError } from "@shared/errors/AppError";
import { User } from "@modules/user/entities/user.entity";
import { IDatasetRepository } from "../repositories/IDataset.repository";
import { UserDatasetUpdateService } from "./userDatasetUpdate.service";
import { Dataset } from "../entities/dataset.entity";
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

describe("Service: UserDatasetUpdateService", () => {
  let datasetRepositoryMock: Mocked<IDatasetRepository>;

  let userDatasetUpdateService: UserDatasetUpdateService;

  beforeEach(() => {
    datasetRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
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

    const expected = new AppError({
      key: "@dataset_update_service/DATASET_NOT_UPDATED",
      message: "Dataset not updated.",
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    datasetRepositoryMock.updateOne.mockResolvedValueOnce(null);

    expect(() =>
      userDatasetUpdateService.execute({
        dataset_id,
        data,
        user: {
          id: dataset.user_id,
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
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

    const expected = new AppError({
      key: "@dataset_update_service/TAGS_NOT_PROVIDED",
      message: "Tags must be a comma-separated list.",
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    expect(() =>
      userDatasetUpdateService.execute({
        dataset_id,
        data,
        user: {
          id: dataset.user_id,
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
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

    const expected = new AppError({
      key: "@dataset_update_service/INVALID_DESCRIPTION",
      message: "Invalid description.",
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    expect(() =>
      userDatasetUpdateService.execute({
        dataset_id,
        data,
        user: {
          id: dataset.user_id,
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
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

    const expected = new AppError({
      key: "@dataset_update_service/DATASET_NOT_EDITABLE",
      message: "Dataset not editable.",
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    expect(() =>
      userDatasetUpdateService.execute({
        dataset_id,
        data,
        user: {
          id: dataset.user_id,
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });

  it("should throw if the dataset was not found", async () => {
    const expected = new AppError({
      key: "@dataset_update_service/DATASET_NOT_FOUND",
      message: "Dataset not found.",
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    expect(() =>
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
    ).rejects.toThrowError(expected);
  });
});

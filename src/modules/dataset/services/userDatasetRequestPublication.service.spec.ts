import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

import { parse } from "@shared/utils/instanceParser";
import { faker } from "@faker-js/faker";
import { AppError } from "@shared/errors/AppError";
import { User } from "@modules/user/entities/user.entity";
import { IDatasetRepository } from "../repositories/IDataset.repository";
import { UserDatasetRequestPublicationService } from "./userDatasetRequestPublication.service";
import { Dataset } from "../entities/dataset.entity";
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

describe("Service: UserDatasetRequestPublicationService", () => {
  let datasetRepositoryMock: Mocked<IDatasetRepository>;

  let userDatasetRequestPublicationService: UserDatasetRequestPublicationService;

  beforeEach(() => {
    datasetRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    userDatasetRequestPublicationService =
      new UserDatasetRequestPublicationService(datasetRepositoryMock);
  });

  it("should request the publish of a dataset", async () => {
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
      public_status: 2,
    };

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    datasetRepositoryMock.updateOne.mockResolvedValueOnce(expected);

    const response = await userDatasetRequestPublicationService.execute({
      dataset_id,
      user: {
        id: dataset.user_id,
      } as User,
      language: "en",
    });

    expect(response).toMatchObject(expected);
  });

  it("should throw if dataset was not found after upload", async () => {
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
      userDatasetRequestPublicationService.execute({
        dataset_id,
        user: {
          id: dataset.user_id,
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });

  it("should throw if dataset is not editable", async () => {
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
      userDatasetRequestPublicationService.execute({
        dataset_id,
        user: {
          id: dataset.user_id,
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });

  it("should throw if dataset was not found", async () => {
    const dataset_id = faker.string.uuid();

    const expected = new AppError({
      key: "@dataset_update_service/DATASET_NOT_FOUND",
      message: "Dataset not found.",
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    expect(() =>
      userDatasetRequestPublicationService.execute({
        dataset_id,
        user: {
          id: faker.string.uuid(),
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });
});

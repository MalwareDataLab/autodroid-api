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
import { UserDatasetRequestPublicationService } from "./userDatasetRequestPublication.service";

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
      getCountPublicOrUserPrivate: vi.fn(),
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

  it("should throw if dataset was not updated", async () => {
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
      userDatasetRequestPublicationService.execute({
        dataset_id,
        user: {
          id: dataset.user_id,
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_request_publication_service/DATASET_NOT_UPDATED",
      }),
    );
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

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    await expect(() =>
      userDatasetRequestPublicationService.execute({
        dataset_id,
        user: {
          id: dataset.user_id,
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_request_publication_service/DATASET_NOT_EDITABLE",
      }),
    );
  });

  it("should throw if dataset was not found", async () => {
    const dataset_id = faker.string.uuid();

    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      userDatasetRequestPublicationService.execute({
        dataset_id,
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

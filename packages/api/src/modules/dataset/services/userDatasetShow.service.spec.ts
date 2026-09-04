import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Util import
import { User } from "@modules/user/entities/user.entity";
import { Dataset } from "../entities/dataset.entity";

// Enum import
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

// Repository import
import { IDatasetRepository } from "../repositories/IDataset.repository";

// Service import
import { UserDatasetShowService } from "./userDatasetShow.service";

describe("Service: UserDatasetShowService", () => {
  let datasetRepositoryMock: Mocked<IDatasetRepository>;

  let userDatasetShowService: UserDatasetShowService;

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

    userDatasetShowService = new UserDatasetShowService(datasetRepositoryMock);
  });

  it("should get one dataset", async () => {
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

    const response = await userDatasetShowService.execute({
      dataset_id,
      user: {
        id: dataset.user_id,
      } as User,
      language: "en",
    });

    expect(response).toMatchObject(dataset);
  });

  it("should throw if dataset was not found", async () => {
    const dataset_id = faker.string.uuid();

    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      userDatasetShowService.execute({
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

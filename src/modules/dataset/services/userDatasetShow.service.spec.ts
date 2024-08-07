import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

import { parse } from "@shared/utils/instanceParser";
import { faker } from "@faker-js/faker";
import { AppError } from "@shared/errors/AppError";
import { User } from "@modules/user/entities/user.entity";
import { IDatasetRepository } from "../repositories/IDataset.repository";
import { UserDatasetShowService } from "./userDatasetShow.service";
import { Dataset } from "../entities/dataset.entity";
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

describe("Service: UserDatasetShowService", () => {
  let datasetRepositoryMock: Mocked<IDatasetRepository>;

  let userDatasetShowService: UserDatasetShowService;

  beforeEach(() => {
    datasetRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
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

    const expected = new AppError({
      key: "@dataset_update_service/DATASET_NOT_FOUND",
      message: "Dataset not found.",
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    expect(() =>
      userDatasetShowService.execute({
        dataset_id,
        user: {
          id: faker.string.uuid(),
        } as User,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });
});

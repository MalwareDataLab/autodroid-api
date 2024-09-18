import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

import { parse } from "@shared/utils/instanceParser";
import { faker } from "@faker-js/faker";
import { User } from "@modules/user/entities/user.entity";
import { IDatasetRepository } from "../repositories/IDataset.repository";
import { UserDatasetIndexService } from "./userDatasetIndex.service";
import { Dataset } from "../entities/dataset.entity";
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

describe("Service: UserDatasetIndexService", () => {
  let datasetRepositoryMock: Mocked<IDatasetRepository>;

  let userDatasetIndexService: UserDatasetIndexService;

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

    userDatasetIndexService = new UserDatasetIndexService(
      datasetRepositoryMock,
    );
  });

  it("should list datasets", async () => {
    const dataset: Dataset = parse(Dataset, {
      id: faker.string.uuid(),
      description: faker.word.words(3),
      tags: "one,two,three",
      user_id: faker.string.uuid(),
      visibility: DATASET_VISIBILITY.PRIVATE,
      updated_at: new Date(),
      created_at: new Date(),
    } satisfies Partial<Dataset>);

    datasetRepositoryMock.findManyPublicOrUserPrivate.mockResolvedValueOnce([
      dataset,
    ]);

    const response = await userDatasetIndexService.execute({
      user: {
        id: dataset.user_id,
      } as User,
    });

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining(dataset),
          }),
        ]),
      }),
    );
  });
});

import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { datasetFactory } from "../entities/factories/dataset.factory";

// Repository import
import { IDatasetRepository } from "../repositories/IDataset.repository";

// Enum import
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

// Service import
import { UserDatasetIndexService } from "./userDatasetIndex.service";

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
    const dataset = datasetFactory.build(
      {
        description: faker.word.words(3),
        tags: "one,two,three",
        visibility: DATASET_VISIBILITY.PUBLIC,
      },
      { transient: { withRelations: true } },
    );

    datasetRepositoryMock.findManyPublicOrUserPrivate.mockResolvedValueOnce([
      dataset,
    ]);

    const response = await userDatasetIndexService.execute({
      user: dataset.user,
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

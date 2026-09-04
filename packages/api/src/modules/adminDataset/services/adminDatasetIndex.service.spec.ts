import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Repository import
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

// Service import
import { AdminDatasetIndexService } from "./adminDatasetIndex.service";

describe("Service: AdminDatasetIndexService", () => {
  let datasetRepositoryMock: Mocked<IDatasetRepository>;

  let adminDatasetIndexService: AdminDatasetIndexService;

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

    adminDatasetIndexService = new AdminDatasetIndexService(
      datasetRepositoryMock,
    );
  });

  it("should list datasets", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const dataset = datasetFactory.build(
      {},
      { transient: { withRelations: true } },
    );

    datasetRepositoryMock.getCount.mockResolvedValueOnce(1);
    datasetRepositoryMock.findMany.mockResolvedValueOnce([dataset]);

    const response = await adminDatasetIndexService.execute({
      filter: {},
      user,
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

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminDatasetIndexService.execute({
        filter: {},
        user,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});

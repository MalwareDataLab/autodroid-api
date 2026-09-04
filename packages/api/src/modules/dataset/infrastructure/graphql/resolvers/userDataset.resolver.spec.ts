import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Entity import
import { PaginatedDataset } from "@modules/dataset/entities/dataset.entity";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";

// Constant import
import { DatasetSortingOptions } from "@modules/dataset/constants/datasetSortingOptions.constant";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { UserDatasetIndexService } from "@modules/dataset/services/userDatasetIndex.service";
import { UserDatasetShowService } from "@modules/dataset/services/userDatasetShow.service";
import { UserDatasetCreateService } from "@modules/dataset/services/userDatasetCreate.service";
import { UserDatasetUpdateService } from "@modules/dataset/services/userDatasetUpdate.service";
import { UserDatasetDeleteService } from "@modules/dataset/services/userDatasetDelete.service";
import { UserDatasetRequestPublicationService } from "@modules/dataset/services/userDatasetRequestPublication.service";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import {
  UserDatasetCreateSchema,
  UserDatasetUpdateSchema,
} from "@modules/dataset/schemas/userDataset.schema";

// Target import
import { UserDatasetResolver } from "./userDataset.resolver";

describe("Resolver: UserDatasetResolver", () => {
  const user = userFactory.build();
  const dataset = datasetFactory.build();

  const graphQLContext = {
    user_session: { user },
    language: "en",
  } as GraphQLContext;

  const pagination = { first: 10 } as PaginationSchema;
  const sorting: SortingFieldSchema<typeof DatasetSortingOptions>[] = [
    { field: "created_at", order: SORT_ORDER.DESC },
  ];

  let userDatasetIndexService: { execute: ReturnType<typeof vi.fn> };
  let userDatasetShowService: { execute: ReturnType<typeof vi.fn> };
  let userDatasetCreateService: { execute: ReturnType<typeof vi.fn> };
  let userDatasetUpdateService: { execute: ReturnType<typeof vi.fn> };
  let userDatasetDeleteService: { execute: ReturnType<typeof vi.fn> };
  let userDatasetRequestPublicationService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let userDatasetResolver: UserDatasetResolver;

  beforeEach(() => {
    userDatasetIndexService = { execute: vi.fn() };
    userDatasetShowService = { execute: vi.fn() };
    userDatasetCreateService = { execute: vi.fn() };
    userDatasetUpdateService = { execute: vi.fn() };
    userDatasetDeleteService = { execute: vi.fn() };
    userDatasetRequestPublicationService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserDatasetIndexService) return userDatasetIndexService;
      if (token === UserDatasetShowService) return userDatasetShowService;
      if (token === UserDatasetCreateService) return userDatasetCreateService;
      if (token === UserDatasetUpdateService) return userDatasetUpdateService;
      if (token === UserDatasetDeleteService) return userDatasetDeleteService;
      if (token === UserDatasetRequestPublicationService)
        return userDatasetRequestPublicationService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userDatasetResolver = new UserDatasetResolver();
  });

  it("should list the session user datasets forwarding pagination and sorting", async () => {
    const paginatedDatasets = {
      edges: [],
      total_count: 0,
    } as unknown as PaginatedDataset;
    userDatasetIndexService.execute.mockResolvedValueOnce(paginatedDatasets);

    const result = await userDatasetResolver.userDatasets(
      pagination,
      sorting,
      graphQLContext,
    );

    expect(userDatasetIndexService.execute).toHaveBeenCalledWith({
      user,
      pagination,
      sorting,
    });
    expect(result).toBe(paginatedDatasets);
  });

  it("should propagate a failure listing the datasets", async () => {
    const error = new Error("index failed");
    userDatasetIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetResolver.userDatasets(pagination, sorting, graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should show a dataset by id", async () => {
    userDatasetShowService.execute.mockResolvedValueOnce(dataset);

    const result = await userDatasetResolver.userDataset(
      dataset.id,
      graphQLContext,
    );

    expect(userDatasetShowService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      user,
      language: "en",
    });
    expect(result).toBe(dataset);
  });

  it("should propagate a failure showing the dataset", async () => {
    const error = new Error("show failed");
    userDatasetShowService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetResolver.userDataset(dataset.id, graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should create a dataset", async () => {
    const data = {
      filename: "samples.csv",
      mime_type: MIME_TYPE.CSV,
      size: 1024,
    } as UserDatasetCreateSchema;
    userDatasetCreateService.execute.mockResolvedValueOnce(dataset);

    const result = await userDatasetResolver.userDatasetCreate(
      data,
      graphQLContext,
    );

    expect(userDatasetCreateService.execute).toHaveBeenCalledWith({
      data,
      user,
      language: "en",
    });
    expect(result).toBe(dataset);
  });

  it("should propagate a failure creating the dataset", async () => {
    const error = new Error("create failed");
    userDatasetCreateService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetResolver.userDatasetCreate(
        {} as UserDatasetCreateSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should update a dataset", async () => {
    const data = { description: "updated" } as UserDatasetUpdateSchema;
    userDatasetUpdateService.execute.mockResolvedValueOnce(dataset);

    const result = await userDatasetResolver.userDatasetUpdate(
      dataset.id,
      data,
      graphQLContext,
    );

    expect(userDatasetUpdateService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      data,
      user,
      language: "en",
    });
    expect(result).toBe(dataset);
  });

  it("should propagate a failure updating the dataset", async () => {
    const error = new Error("update failed");
    userDatasetUpdateService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetResolver.userDatasetUpdate(
        dataset.id,
        {} as UserDatasetUpdateSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a dataset", async () => {
    userDatasetDeleteService.execute.mockResolvedValueOnce(dataset);

    const result = await userDatasetResolver.userDatasetDelete(
      dataset.id,
      graphQLContext,
    );

    expect(userDatasetDeleteService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      user,
      language: "en",
    });
    expect(result).toBe(dataset);
  });

  it("should propagate a failure deleting the dataset", async () => {
    const error = new Error("delete failed");
    userDatasetDeleteService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetResolver.userDatasetDelete(dataset.id, graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should request the dataset publication", async () => {
    userDatasetRequestPublicationService.execute.mockResolvedValueOnce(dataset);

    const result = await userDatasetResolver.userDatasetRequestPublication(
      dataset.id,
      graphQLContext,
    );

    expect(userDatasetRequestPublicationService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      user,
      language: "en",
    });
    expect(result).toBe(dataset);
  });

  it("should propagate a failure requesting the dataset publication", async () => {
    const error = new Error("publication failed");
    userDatasetRequestPublicationService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetResolver.userDatasetRequestPublication(
        dataset.id,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });
});

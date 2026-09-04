import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Entity import
import { PaginatedDataset } from "@modules/dataset/entities/dataset.entity";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Constant import
import { DatasetSortingOptions } from "@modules/dataset/constants/datasetSortingOptions.constant";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { AdminDatasetIndexService } from "@modules/adminDataset/services/adminDatasetIndex.service";
import { AdminDatasetShowService } from "@modules/adminDataset/services/adminDatasetShow.service";
import { AdminDatasetUpdateService } from "@modules/adminDataset/services/adminDatasetUpdate.service";
import { AdminDatasetDeleteService } from "@modules/adminDataset/services/adminDatasetDelete.service";
import { AdminDatasetUpdateVisibilityService } from "@modules/adminDataset/services/adminDatasetUpdateVisibility.service";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import {
  AdminDatasetIndexSchema,
  AdminDatasetUpdateSchema,
  AdminDatasetUpdateVisibilitySchema,
} from "@modules/adminDataset/schemas/adminDataset.schema";

// Target import
import { AdminDatasetResolver } from "./adminDataset.resolver";

describe("Resolver: AdminDatasetResolver", () => {
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

  let adminDatasetIndexService: { execute: ReturnType<typeof vi.fn> };
  let adminDatasetShowService: { execute: ReturnType<typeof vi.fn> };
  let adminDatasetUpdateService: { execute: ReturnType<typeof vi.fn> };
  let adminDatasetDeleteService: { execute: ReturnType<typeof vi.fn> };
  let adminDatasetUpdateVisibilityService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let adminDatasetResolver: AdminDatasetResolver;

  beforeEach(() => {
    adminDatasetIndexService = { execute: vi.fn() };
    adminDatasetShowService = { execute: vi.fn() };
    adminDatasetUpdateService = { execute: vi.fn() };
    adminDatasetDeleteService = { execute: vi.fn() };
    adminDatasetUpdateVisibilityService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminDatasetIndexService) return adminDatasetIndexService;
      if (token === AdminDatasetShowService) return adminDatasetShowService;
      if (token === AdminDatasetUpdateService) return adminDatasetUpdateService;
      if (token === AdminDatasetDeleteService) return adminDatasetDeleteService;
      if (token === AdminDatasetUpdateVisibilityService)
        return adminDatasetUpdateVisibilityService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminDatasetResolver = new AdminDatasetResolver();
  });

  it("should list the datasets forwarding filter, pagination and sorting", async () => {
    const filter = {
      visibility: DATASET_VISIBILITY.PUBLIC,
    } as AdminDatasetIndexSchema;
    const paginatedDatasets = {
      edges: [],
      total_count: 0,
    } as unknown as PaginatedDataset;
    adminDatasetIndexService.execute.mockResolvedValueOnce(paginatedDatasets);

    const result = await adminDatasetResolver.adminDatasets(
      filter,
      pagination,
      sorting,
      graphQLContext,
    );

    expect(adminDatasetIndexService.execute).toHaveBeenCalledWith({
      user,
      filter,
      pagination,
      sorting,
    });
    expect(result).toBe(paginatedDatasets);
  });

  it("should propagate a failure listing the datasets", async () => {
    const error = new Error("index failed");
    adminDatasetIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      adminDatasetResolver.adminDatasets(
        {} as AdminDatasetIndexSchema,
        pagination,
        sorting,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should show a dataset by id", async () => {
    adminDatasetShowService.execute.mockResolvedValueOnce(dataset);

    const result = await adminDatasetResolver.adminDataset(
      dataset.id,
      graphQLContext,
    );

    expect(adminDatasetShowService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      user,
      language: "en",
    });
    expect(result).toBe(dataset);
  });

  it("should propagate a failure showing the dataset", async () => {
    const error = new Error("show failed");
    adminDatasetShowService.execute.mockRejectedValueOnce(error);

    await expect(
      adminDatasetResolver.adminDataset(dataset.id, graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should update a dataset", async () => {
    const data = { description: "updated" } as AdminDatasetUpdateSchema;
    adminDatasetUpdateService.execute.mockResolvedValueOnce(dataset);

    const result = await adminDatasetResolver.adminDatasetUpdate(
      dataset.id,
      data,
      graphQLContext,
    );

    expect(adminDatasetUpdateService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      data,
      user,
      language: "en",
    });
    expect(result).toBe(dataset);
  });

  it("should propagate a failure updating the dataset", async () => {
    const error = new Error("update failed");
    adminDatasetUpdateService.execute.mockRejectedValueOnce(error);

    await expect(
      adminDatasetResolver.adminDatasetUpdate(
        dataset.id,
        {} as AdminDatasetUpdateSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a dataset", async () => {
    adminDatasetDeleteService.execute.mockResolvedValueOnce(dataset);

    const result = await adminDatasetResolver.adminDatasetDelete(
      dataset.id,
      graphQLContext,
    );

    expect(adminDatasetDeleteService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      user,
      language: "en",
    });
    expect(result).toBe(dataset);
  });

  it("should propagate a failure deleting the dataset", async () => {
    const error = new Error("delete failed");
    adminDatasetDeleteService.execute.mockRejectedValueOnce(error);

    await expect(
      adminDatasetResolver.adminDatasetDelete(dataset.id, graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should update the dataset visibility", async () => {
    const data = {
      visibility: DATASET_VISIBILITY.PUBLIC,
    } as AdminDatasetUpdateVisibilitySchema;
    adminDatasetUpdateVisibilityService.execute.mockResolvedValueOnce(dataset);

    const result = await adminDatasetResolver.adminDatasetUpdateVisibility(
      dataset.id,
      data,
      graphQLContext,
    );

    expect(adminDatasetUpdateVisibilityService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      data,
      user,
      language: "en",
    });
    expect(result).toBe(dataset);
  });

  it("should propagate a failure updating the dataset visibility", async () => {
    const error = new Error("visibility update failed");
    adminDatasetUpdateVisibilityService.execute.mockRejectedValueOnce(error);

    await expect(
      adminDatasetResolver.adminDatasetUpdateVisibility(
        dataset.id,
        {} as AdminDatasetUpdateVisibilitySchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });
});

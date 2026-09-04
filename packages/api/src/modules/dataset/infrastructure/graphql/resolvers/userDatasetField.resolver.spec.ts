import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Entity import
import { PaginatedProcessing } from "@modules/processing/entities/processing.entity";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { UserProcessingIndexService } from "@modules/processing/services/userProcessingIndex.service";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import { ProcessingIndexSchema } from "@modules/processing/schemas/processingIndex.schema";

// Target import
import { UserDatasetFieldResolver } from "./userDatasetField.resolver";

describe("Resolver: UserDatasetFieldResolver", () => {
  const user = userFactory.build();
  const dataset = datasetFactory.build();

  const graphQLContext = {
    user_session: { user },
    language: "en",
  } as GraphQLContext;

  const pagination = { first: 10 } as PaginationSchema;
  const sorting: SortingFieldSchema<typeof ProcessingSortingOptions>[] = [
    { field: "created_at", order: SORT_ORDER.DESC },
  ];

  let userProcessingIndexService: { execute: ReturnType<typeof vi.fn> };

  let userDatasetFieldResolver: UserDatasetFieldResolver;

  beforeEach(() => {
    userProcessingIndexService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserProcessingIndexService)
        return userProcessingIndexService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userDatasetFieldResolver = new UserDatasetFieldResolver();
  });

  it("should scope the processes to the root dataset id", async () => {
    const params = {
      status: PROCESSING_STATUS.SUCCEEDED,
    } as ProcessingIndexSchema;
    const paginatedProcesses = {
      edges: [],
      total_count: 0,
    } as unknown as PaginatedProcessing;
    userProcessingIndexService.execute.mockResolvedValueOnce(
      paginatedProcesses,
    );

    const result = await userDatasetFieldResolver.processes(
      dataset,
      params,
      pagination,
      sorting,
      graphQLContext,
    );

    expect(userProcessingIndexService.execute).toHaveBeenCalledWith({
      user,
      params: {
        status: PROCESSING_STATUS.SUCCEEDED,
        dataset_id: dataset.id,
      },
      pagination,
      sorting,
      language: "en",
    });
    expect(result).toBe(paginatedProcesses);
  });

  it("should override an incoming dataset_id filter with the root dataset id", async () => {
    const params = {
      dataset_id: "0d2c5c5e-0000-4000-8000-000000000000",
    } as ProcessingIndexSchema;
    userProcessingIndexService.execute.mockResolvedValueOnce(
      {} as PaginatedProcessing,
    );

    await userDatasetFieldResolver.processes(
      dataset,
      params,
      pagination,
      sorting,
      graphQLContext,
    );

    expect(userProcessingIndexService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { dataset_id: dataset.id },
      }),
    );
  });

  it("should propagate a failure listing the dataset processes", async () => {
    const error = new Error("index failed");
    userProcessingIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetFieldResolver.processes(
        dataset,
        {} as ProcessingIndexSchema,
        pagination,
        sorting,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });
});

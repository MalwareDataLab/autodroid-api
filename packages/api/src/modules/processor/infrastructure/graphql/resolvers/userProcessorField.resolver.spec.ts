import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

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
import { UserProcessorFieldResolver } from "./userProcessorField.resolver";

describe("Resolver: UserProcessorFieldResolver", () => {
  const user = userFactory.build();
  const processor = processorFactory.build();

  const graphQLContext = {
    user_session: { user },
    language: "en",
  } as GraphQLContext;

  const pagination = { first: 10 } as PaginationSchema;
  const sorting: SortingFieldSchema<typeof ProcessingSortingOptions>[] = [
    { field: "created_at", order: SORT_ORDER.DESC },
  ];

  let userProcessingIndexService: { execute: ReturnType<typeof vi.fn> };

  let userProcessorFieldResolver: UserProcessorFieldResolver;

  beforeEach(() => {
    userProcessingIndexService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserProcessingIndexService)
        return userProcessingIndexService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userProcessorFieldResolver = new UserProcessorFieldResolver();
  });

  it("should scope the processes to the root processor id", async () => {
    const params = {
      status: PROCESSING_STATUS.PENDING,
    } as ProcessingIndexSchema;
    const paginatedProcesses = {
      edges: [],
      total_count: 0,
    } as unknown as PaginatedProcessing;
    userProcessingIndexService.execute.mockResolvedValueOnce(
      paginatedProcesses,
    );

    const result = await userProcessorFieldResolver.processes(
      processor,
      params,
      pagination,
      sorting,
      graphQLContext,
    );

    expect(userProcessingIndexService.execute).toHaveBeenCalledWith({
      user,
      params: {
        status: PROCESSING_STATUS.PENDING,
        processor_id: processor.id,
      },
      pagination,
      sorting,
      language: "en",
    });
    expect(result).toBe(paginatedProcesses);
  });

  it("should override an incoming processor_id filter with the root processor id", async () => {
    const params = {
      processor_id: "0d2c5c5e-0000-4000-8000-000000000000",
    } as ProcessingIndexSchema;
    userProcessingIndexService.execute.mockResolvedValueOnce(
      {} as PaginatedProcessing,
    );

    await userProcessorFieldResolver.processes(
      processor,
      params,
      pagination,
      sorting,
      graphQLContext,
    );

    expect(userProcessingIndexService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { processor_id: processor.id },
      }),
    );
  });

  it("should propagate a failure listing the processor processes", async () => {
    const error = new Error("index failed");
    userProcessingIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessorFieldResolver.processes(
        processor,
        {} as ProcessingIndexSchema,
        pagination,
        sorting,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });
});

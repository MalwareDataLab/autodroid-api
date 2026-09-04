import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Entity import
import { PaginatedProcessing } from "@modules/processing/entities/processing.entity";
import { ProcessingTimeEstimation } from "@modules/processing/entities/processingTimeEstimation.entity";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { AdminProcessingIndexService } from "@modules/adminProcessing/services/adminProcessingIndex.service";
import { AdminProcessingShowService } from "@modules/adminProcessing/services/adminProcessingShow.service";
import { AdminProcessingUpdateService } from "@modules/adminProcessing/services/adminProcessingUpdate.service";
import { AdminProcessingDeleteService } from "@modules/adminProcessing/services/adminProcessingDelete.service";
import { AdminProcessingCleanExpiredService } from "@modules/adminProcessing/services/adminProcessingCleanExpired.service";
import { AdminProcessingFailDanglingService } from "@modules/adminProcessing/services/adminProcessingFailDangling.service";
import { AdminProcessingEstimatedExecutionTimeIndexService } from "@modules/adminProcessing/services/adminProcessingEstimatedExecutionTimeIndex.service";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import {
  AdminProcessingIndexSchema,
  AdminProcessingUpdateSchema,
  AdminProcessingFailDanglingSchema,
} from "@modules/adminProcessing/schemas/adminProcessing.schema";
import { AdminProcessingGetEstimatedExecutionTimeSchema } from "@modules/adminProcessing/schemas/adminProcessingEstimatedExecutionTime.schema";

// Target import
import { AdminProcessingResolver } from "./adminProcessing.resolver";

describe("Resolver: AdminProcessingResolver", () => {
  const user = userFactory.build();
  const processing = processingFactory.build();

  const graphQLContext = {
    user_session: { user },
    language: "en",
  } as GraphQLContext;

  const pagination = { first: 10 } as PaginationSchema;
  const sorting: SortingFieldSchema<typeof ProcessingSortingOptions>[] = [
    { field: "created_at", order: SORT_ORDER.DESC },
  ];

  let adminProcessingIndexService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessingShowService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessingUpdateService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessingDeleteService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessingCleanExpiredService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let adminProcessingFailDanglingService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let adminProcessingEstimatedExecutionTimeIndexService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let adminProcessingResolver: AdminProcessingResolver;

  beforeEach(() => {
    adminProcessingIndexService = { execute: vi.fn() };
    adminProcessingShowService = { execute: vi.fn() };
    adminProcessingUpdateService = { execute: vi.fn() };
    adminProcessingDeleteService = { execute: vi.fn() };
    adminProcessingCleanExpiredService = { execute: vi.fn() };
    adminProcessingFailDanglingService = { execute: vi.fn() };
    adminProcessingEstimatedExecutionTimeIndexService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminProcessingIndexService)
        return adminProcessingIndexService;
      if (token === AdminProcessingShowService)
        return adminProcessingShowService;
      if (token === AdminProcessingUpdateService)
        return adminProcessingUpdateService;
      if (token === AdminProcessingDeleteService)
        return adminProcessingDeleteService;
      if (token === AdminProcessingCleanExpiredService)
        return adminProcessingCleanExpiredService;
      if (token === AdminProcessingFailDanglingService)
        return adminProcessingFailDanglingService;
      if (token === AdminProcessingEstimatedExecutionTimeIndexService)
        return adminProcessingEstimatedExecutionTimeIndexService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminProcessingResolver = new AdminProcessingResolver();
  });

  it("should list the processes forwarding filter, pagination and sorting", async () => {
    const filter = {
      status: PROCESSING_STATUS.SUCCEEDED,
    } as AdminProcessingIndexSchema;
    const paginatedProcesses = {
      edges: [],
      total_count: 0,
    } as unknown as PaginatedProcessing;
    adminProcessingIndexService.execute.mockResolvedValueOnce(
      paginatedProcesses,
    );

    const result = await adminProcessingResolver.adminProcesses(
      filter,
      pagination,
      sorting,
      graphQLContext,
    );

    expect(adminProcessingIndexService.execute).toHaveBeenCalledWith({
      user,
      filter,
      pagination,
      sorting,
    });
    expect(result).toBe(paginatedProcesses);
  });

  it("should propagate a failure listing the processes", async () => {
    const error = new Error("index failed");
    adminProcessingIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessingResolver.adminProcesses(
        {} as AdminProcessingIndexSchema,
        pagination,
        sorting,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should show a processing by id", async () => {
    adminProcessingShowService.execute.mockResolvedValueOnce(processing);

    const result = await adminProcessingResolver.adminProcessing(
      processing.id,
      graphQLContext,
    );

    expect(adminProcessingShowService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      user,
      language: "en",
    });
    expect(result).toBe(processing);
  });

  it("should propagate a failure showing the processing", async () => {
    const error = new Error("show failed");
    adminProcessingShowService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessingResolver.adminProcessing(processing.id, graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should update a processing", async () => {
    const data = {
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    } as AdminProcessingUpdateSchema;
    adminProcessingUpdateService.execute.mockResolvedValueOnce(processing);

    const result = await adminProcessingResolver.adminProcessingUpdate(
      processing.id,
      data,
      graphQLContext,
    );

    expect(adminProcessingUpdateService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      data,
      user,
      language: "en",
    });
    expect(result).toBe(processing);
  });

  it("should propagate a failure updating the processing", async () => {
    const error = new Error("update failed");
    adminProcessingUpdateService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessingResolver.adminProcessingUpdate(
        processing.id,
        {} as AdminProcessingUpdateSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a processing", async () => {
    adminProcessingDeleteService.execute.mockResolvedValueOnce(processing);

    const result = await adminProcessingResolver.adminProcessingDelete(
      processing.id,
      graphQLContext,
    );

    expect(adminProcessingDeleteService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      user,
      language: "en",
    });
    expect(result).toBe(processing);
  });

  it("should propagate a failure deleting the processing", async () => {
    const error = new Error("delete failed");
    adminProcessingDeleteService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessingResolver.adminProcessingDelete(
        processing.id,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should return the amount of expired processes cleaned", async () => {
    adminProcessingCleanExpiredService.execute.mockResolvedValueOnce(3);

    const result =
      await adminProcessingResolver.adminProcessingCleanExpired(graphQLContext);

    expect(adminProcessingCleanExpiredService.execute).toHaveBeenCalledWith({
      user,
      language: "en",
    });
    expect(result).toBe(3);
  });

  it("should propagate a failure cleaning the expired processes", async () => {
    const error = new Error("clean failed");
    adminProcessingCleanExpiredService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessingResolver.adminProcessingCleanExpired(graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should return the amount of dangling processes failed", async () => {
    const params = {
      status: PROCESSING_STATUS.RUNNING,
    } as AdminProcessingFailDanglingSchema;
    adminProcessingFailDanglingService.execute.mockResolvedValueOnce(2);

    const result = await adminProcessingResolver.adminProcessingFailDangling(
      graphQLContext,
      params,
    );

    expect(adminProcessingFailDanglingService.execute).toHaveBeenCalledWith({
      user,
      params,
      language: "en",
    });
    expect(result).toBe(2);
  });

  it("should propagate a failure failing the dangling processes", async () => {
    const error = new Error("fail dangling failed");
    adminProcessingFailDanglingService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessingResolver.adminProcessingFailDangling(
        graphQLContext,
        {} as AdminProcessingFailDanglingSchema,
      ),
    ).rejects.toThrowError(error);
  });

  it("should return the processing time estimation list", async () => {
    const filter = {
      dataset_id: processing.dataset_id,
      processor_id: processing.processor_id,
    } as AdminProcessingGetEstimatedExecutionTimeSchema;
    const processingTimeEstimation = [
      { seconds: 120 },
    ] as unknown as ProcessingTimeEstimation[];
    adminProcessingEstimatedExecutionTimeIndexService.execute.mockResolvedValueOnce(
      processingTimeEstimation,
    );

    const result = await adminProcessingResolver.adminProcessingTimeEstimation(
      filter,
      graphQLContext,
    );

    expect(
      adminProcessingEstimatedExecutionTimeIndexService.execute,
    ).toHaveBeenCalledWith({
      user,
      filter,
      language: "en",
    });
    expect(result).toBe(processingTimeEstimation);
  });

  it("should propagate a failure estimating the processing time", async () => {
    const error = new Error("estimation failed");
    adminProcessingEstimatedExecutionTimeIndexService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      adminProcessingResolver.adminProcessingTimeEstimation(
        {} as AdminProcessingGetEstimatedExecutionTimeSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });
});

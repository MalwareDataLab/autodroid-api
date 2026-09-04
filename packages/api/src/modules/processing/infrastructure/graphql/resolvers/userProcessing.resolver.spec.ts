import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Entity import
import { PaginatedProcessing } from "@modules/processing/entities/processing.entity";
import { ProcessingTimeEstimation } from "@modules/processing/entities/processingTimeEstimation.entity";
import { ProcessingFinishTimeEstimation } from "@modules/processing/entities/processingFinishTimeEstimation.entity";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { UserProcessingIndexService } from "@modules/processing/services/userProcessingIndex.service";
import { UserProcessingShowService } from "@modules/processing/services/userProcessingShow.service";
import { UserProcessingDeleteService } from "@modules/processing/services/userProcessingDelete.service";
import { UserRequestDatasetProcessingService } from "@modules/processing/services/userRequestDatasetProcessing.service";
import { UserProcessingExtendKeepUntilService } from "@modules/processing/services/userProcessingExtendKeepUntil.service";
import { UserProcessingUpdateVisibilityService } from "@modules/processing/services/userProcessingUpdateVisibility.service";
import { UserProcessingGetEstimatedFinishDateService } from "@modules/processing/services/userProcessingGetEstimatedFinishDate.service";
import { UserProcessingGetEstimatedExecutionTimeService } from "@modules/processing/services/userProcessingGetEstimatedExecutionTime.service";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import { ProcessingIndexSchema } from "@modules/processing/schemas/processingIndex.schema";
import { RequestDatasetProcessingSchema } from "@modules/processing/schemas/requestDatasetProcessing.schema";
import { ProcessingUpdateVisibilitySchema } from "@modules/processing/schemas/processingUpdateVisibility.schema";
import { UserProcessingExtendKeepUntilSchema } from "@modules/processing/schemas/processingExtendKeepUntil.schema";
import {
  ProcessingGetEstimatedExecutionTimeSchema,
  ProcessingGetEstimatedFinishTimeSchema,
} from "@modules/processing/schemas/processingTimeEstimation.schema";

// Target import
import { UserProcessingResolver } from "./userProcessing.resolver";

describe("Resolver: UserProcessingResolver", () => {
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

  let userProcessingIndexService: { execute: ReturnType<typeof vi.fn> };
  let userProcessingShowService: { execute: ReturnType<typeof vi.fn> };
  let userProcessingDeleteService: { execute: ReturnType<typeof vi.fn> };
  let userRequestDatasetProcessingService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let userProcessingExtendKeepUntilService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let userProcessingUpdateVisibilityService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let userProcessingGetEstimatedFinishDateService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let userProcessingGetEstimatedExecutionTimeService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let userProcessingResolver: UserProcessingResolver;

  beforeEach(() => {
    userProcessingIndexService = { execute: vi.fn() };
    userProcessingShowService = { execute: vi.fn() };
    userProcessingDeleteService = { execute: vi.fn() };
    userRequestDatasetProcessingService = { execute: vi.fn() };
    userProcessingExtendKeepUntilService = { execute: vi.fn() };
    userProcessingUpdateVisibilityService = { execute: vi.fn() };
    userProcessingGetEstimatedFinishDateService = { execute: vi.fn() };
    userProcessingGetEstimatedExecutionTimeService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserProcessingIndexService)
        return userProcessingIndexService;
      if (token === UserProcessingShowService) return userProcessingShowService;
      if (token === UserProcessingDeleteService)
        return userProcessingDeleteService;
      if (token === UserRequestDatasetProcessingService)
        return userRequestDatasetProcessingService;
      if (token === UserProcessingExtendKeepUntilService)
        return userProcessingExtendKeepUntilService;
      if (token === UserProcessingUpdateVisibilityService)
        return userProcessingUpdateVisibilityService;
      if (token === UserProcessingGetEstimatedFinishDateService)
        return userProcessingGetEstimatedFinishDateService;
      if (token === UserProcessingGetEstimatedExecutionTimeService)
        return userProcessingGetEstimatedExecutionTimeService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userProcessingResolver = new UserProcessingResolver();
  });

  it("should list the session user processes forwarding params, pagination and sorting", async () => {
    const params = {
      status: PROCESSING_STATUS.RUNNING,
    } as ProcessingIndexSchema;
    const paginatedProcesses = {
      edges: [],
      total_count: 0,
    } as unknown as PaginatedProcessing;
    userProcessingIndexService.execute.mockResolvedValueOnce(
      paginatedProcesses,
    );

    const result = await userProcessingResolver.userProcesses(
      params,
      pagination,
      sorting,
      graphQLContext,
    );

    expect(userProcessingIndexService.execute).toHaveBeenCalledWith({
      user,
      params,
      pagination,
      sorting,
      language: "en",
    });
    expect(result).toBe(paginatedProcesses);
  });

  it("should propagate a failure listing the processes", async () => {
    const error = new Error("index failed");
    userProcessingIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessingResolver.userProcesses(
        {} as ProcessingIndexSchema,
        pagination,
        sorting,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should show a processing by id", async () => {
    userProcessingShowService.execute.mockResolvedValueOnce(processing);

    const result = await userProcessingResolver.userProcessing(
      processing.id,
      graphQLContext,
    );

    expect(userProcessingShowService.execute).toHaveBeenCalledWith({
      user,
      processing_id: processing.id,
      language: "en",
    });
    expect(result).toBe(processing);
  });

  it("should propagate a failure showing the processing", async () => {
    const error = new Error("show failed");
    userProcessingShowService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessingResolver.userProcessing(processing.id, graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should request a dataset processing forwarding the data as params", async () => {
    const data = {
      dataset_id: processing.dataset_id,
      processor_id: processing.processor_id,
      parameters: [],
    } as unknown as RequestDatasetProcessingSchema;
    userRequestDatasetProcessingService.execute.mockResolvedValueOnce(
      processing,
    );

    const result = await userProcessingResolver.userRequestDatasetProcessing(
      data,
      graphQLContext,
    );

    expect(userRequestDatasetProcessingService.execute).toHaveBeenCalledWith({
      params: data,
      user,
      language: "en",
    });
    expect(result).toBe(processing);
  });

  it("should propagate a failure requesting the dataset processing", async () => {
    const error = new Error("request failed");
    userRequestDatasetProcessingService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessingResolver.userRequestDatasetProcessing(
        {} as RequestDatasetProcessingSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should update the processing visibility unwrapping the params", async () => {
    const params = {
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    } as ProcessingUpdateVisibilitySchema;
    userProcessingUpdateVisibilityService.execute.mockResolvedValueOnce(
      processing,
    );

    const result = await userProcessingResolver.userProcessingUpdateVisibility(
      processing.id,
      params,
      graphQLContext,
    );

    expect(userProcessingUpdateVisibilityService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
      user,
      language: "en",
    });
    expect(result).toBe(processing);
  });

  it("should propagate a failure updating the processing visibility", async () => {
    const error = new Error("visibility update failed");
    userProcessingUpdateVisibilityService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessingResolver.userProcessingUpdateVisibility(
        processing.id,
        {} as ProcessingUpdateVisibilitySchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should extend the processing keep until unwrapping the params", async () => {
    const keep_until = new Date("2024-05-04T10:00:00.000Z");
    const params = { keep_until } as UserProcessingExtendKeepUntilSchema;
    userProcessingExtendKeepUntilService.execute.mockResolvedValueOnce(
      processing,
    );

    const result = await userProcessingResolver.userProcessingExtendKeepUntil(
      processing.id,
      params,
      graphQLContext,
    );

    expect(userProcessingExtendKeepUntilService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      keep_until,
      user,
      language: "en",
    });
    expect(result).toBe(processing);
  });

  it("should propagate a failure extending the processing keep until", async () => {
    const error = new Error("extend failed");
    userProcessingExtendKeepUntilService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessingResolver.userProcessingExtendKeepUntil(
        processing.id,
        {} as UserProcessingExtendKeepUntilSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a processing", async () => {
    userProcessingDeleteService.execute.mockResolvedValueOnce(processing);

    const result = await userProcessingResolver.userProcessingDelete(
      processing.id,
      graphQLContext,
    );

    expect(userProcessingDeleteService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      user,
      language: "en",
    });
    expect(result).toBe(processing);
  });

  it("should propagate a failure deleting the processing", async () => {
    const error = new Error("delete failed");
    userProcessingDeleteService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessingResolver.userProcessingDelete(
        processing.id,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should return the processing time estimation unwrapping the filter args", async () => {
    const processingTimeEstimation = {
      seconds: 90,
    } as unknown as ProcessingTimeEstimation;
    userProcessingGetEstimatedExecutionTimeService.execute.mockResolvedValueOnce(
      processingTimeEstimation,
    );

    const result = await userProcessingResolver.userProcessingTimeEstimation(
      {
        dataset_id: processing.dataset_id,
        processor_id: processing.processor_id,
      } as ProcessingGetEstimatedExecutionTimeSchema,
      graphQLContext,
    );

    expect(
      userProcessingGetEstimatedExecutionTimeService.execute,
    ).toHaveBeenCalledWith({
      user,
      dataset_id: processing.dataset_id,
      processor_id: processing.processor_id,
      language: "en",
    });
    expect(result).toBe(processingTimeEstimation);
  });

  it("should propagate a failure estimating the processing time", async () => {
    const error = new Error("estimation failed");
    userProcessingGetEstimatedExecutionTimeService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      userProcessingResolver.userProcessingTimeEstimation(
        {} as ProcessingGetEstimatedExecutionTimeSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should return the processing estimated finish unwrapping the args", async () => {
    const processingEstimatedFinish = {
      estimated_finish_date: new Date("2024-05-04T10:00:00.000Z"),
    } as unknown as ProcessingFinishTimeEstimation;
    userProcessingGetEstimatedFinishDateService.execute.mockResolvedValueOnce(
      processingEstimatedFinish,
    );

    const result = await userProcessingResolver.userProcessingEstimatedFinish(
      {
        processing_id: processing.id,
      } as ProcessingGetEstimatedFinishTimeSchema,
      graphQLContext,
    );

    expect(
      userProcessingGetEstimatedFinishDateService.execute,
    ).toHaveBeenCalledWith({
      user,
      processing_id: processing.id,
      language: "en",
    });
    expect(result).toBe(processingEstimatedFinish);
  });

  it("should propagate a failure estimating the processing finish", async () => {
    const error = new Error("finish estimation failed");
    userProcessingGetEstimatedFinishDateService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      userProcessingResolver.userProcessingEstimatedFinish(
        {} as ProcessingGetEstimatedFinishTimeSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });
});

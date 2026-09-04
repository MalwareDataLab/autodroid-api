import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Entity import
import { PaginatedProcessor } from "@modules/processor/entities/processor.entity";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { UserProcessorIndexService } from "@modules/processor/services/userProcessorIndex.service";
import { UserProcessorShowService } from "@modules/processor/services/userProcessorShow.service";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

// Target import
import { UserProcessorResolver } from "./userProcessor.resolver";

describe("Resolver: UserProcessorResolver", () => {
  const user = userFactory.build();
  const processor = processorFactory.build();

  const graphQLContext = {
    user_session: { user },
    language: "en",
  } as GraphQLContext;

  const pagination = { first: 10 } as PaginationSchema;
  const sorting: SortingFieldSchema<typeof ProcessorSortingOptions>[] = [
    { field: "created_at", order: SORT_ORDER.DESC },
  ];

  let userProcessorIndexService: { execute: ReturnType<typeof vi.fn> };
  let userProcessorShowService: { execute: ReturnType<typeof vi.fn> };

  let userProcessorResolver: UserProcessorResolver;

  beforeEach(() => {
    userProcessorIndexService = { execute: vi.fn() };
    userProcessorShowService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserProcessorIndexService) return userProcessorIndexService;
      if (token === UserProcessorShowService) return userProcessorShowService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userProcessorResolver = new UserProcessorResolver();
  });

  it("should list the processors forwarding pagination and sorting without the language", async () => {
    const paginatedProcessors = {
      edges: [],
      total_count: 0,
    } as unknown as PaginatedProcessor;
    userProcessorIndexService.execute.mockResolvedValueOnce(
      paginatedProcessors,
    );

    const result = await userProcessorResolver.userProcessors(
      pagination,
      sorting,
      graphQLContext,
    );

    expect(userProcessorIndexService.execute).toHaveBeenCalledWith({
      user,
      pagination,
      sorting,
    });
    expect(result).toBe(paginatedProcessors);
  });

  it("should propagate a failure listing the processors", async () => {
    const error = new Error("index failed");
    userProcessorIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessorResolver.userProcessors(pagination, sorting, graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should show a processor by id", async () => {
    userProcessorShowService.execute.mockResolvedValueOnce(processor);

    const result = await userProcessorResolver.userProcessor(
      processor.id,
      graphQLContext,
    );

    expect(userProcessorShowService.execute).toHaveBeenCalledWith({
      user,
      processor_id: processor.id,
      language: "en",
    });
    expect(result).toBe(processor);
  });

  it("should propagate a failure showing the processor", async () => {
    const error = new Error("show failed");
    userProcessorShowService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessorResolver.userProcessor(processor.id, graphQLContext),
    ).rejects.toThrowError(error);
  });
});

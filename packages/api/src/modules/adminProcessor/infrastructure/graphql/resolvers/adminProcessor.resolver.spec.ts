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
import { AdminProcessorIndexService } from "@modules/adminProcessor/services/adminProcessorIndex.service";
import { AdminProcessorShowService } from "@modules/adminProcessor/services/adminProcessorShow.service";
import { AdminProcessorCreateService } from "@modules/adminProcessor/services/adminProcessorCreate.service";
import { AdminProcessorUpdateService } from "@modules/adminProcessor/services/adminProcessorUpdate.service";
import { AdminProcessorDeleteService } from "@modules/adminProcessor/services/adminProcessorDelete.service";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import { ProcessorSchema } from "@modules/processor/schemas/processor.schema";

// Target import
import { AdminProcessorResolver } from "./adminProcessor.resolver";

describe("Resolver: AdminProcessorResolver", () => {
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

  let adminProcessorIndexService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessorShowService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessorCreateService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessorUpdateService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessorDeleteService: { execute: ReturnType<typeof vi.fn> };

  let adminProcessorResolver: AdminProcessorResolver;

  beforeEach(() => {
    adminProcessorIndexService = { execute: vi.fn() };
    adminProcessorShowService = { execute: vi.fn() };
    adminProcessorCreateService = { execute: vi.fn() };
    adminProcessorUpdateService = { execute: vi.fn() };
    adminProcessorDeleteService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminProcessorIndexService)
        return adminProcessorIndexService;
      if (token === AdminProcessorShowService) return adminProcessorShowService;
      if (token === AdminProcessorCreateService)
        return adminProcessorCreateService;
      if (token === AdminProcessorUpdateService)
        return adminProcessorUpdateService;
      if (token === AdminProcessorDeleteService)
        return adminProcessorDeleteService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminProcessorResolver = new AdminProcessorResolver();
  });

  it("should list the processors forwarding pagination and sorting", async () => {
    const paginatedProcessors = {
      edges: [],
      total_count: 0,
    } as unknown as PaginatedProcessor;
    adminProcessorIndexService.execute.mockResolvedValueOnce(
      paginatedProcessors,
    );

    const result = await adminProcessorResolver.adminProcessors(
      pagination,
      sorting,
      graphQLContext,
    );

    expect(adminProcessorIndexService.execute).toHaveBeenCalledWith({
      user,
      pagination,
      sorting,
      language: "en",
    });
    expect(result).toBe(paginatedProcessors);
  });

  it("should propagate a failure listing the processors", async () => {
    const error = new Error("index failed");
    adminProcessorIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessorResolver.adminProcessors(
        pagination,
        sorting,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should show a processor by id", async () => {
    adminProcessorShowService.execute.mockResolvedValueOnce(processor);

    const result = await adminProcessorResolver.adminProcessor(
      processor.id,
      graphQLContext,
    );

    expect(adminProcessorShowService.execute).toHaveBeenCalledWith({
      processor_id: processor.id,
      user,
      language: "en",
    });
    expect(result).toBe(processor);
  });

  it("should propagate a failure showing the processor", async () => {
    const error = new Error("show failed");
    adminProcessorShowService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessorResolver.adminProcessor(processor.id, graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should create a processor", async () => {
    const data = { name: "malware-scanner" } as ProcessorSchema;
    adminProcessorCreateService.execute.mockResolvedValueOnce(processor);

    const result = await adminProcessorResolver.adminProcessorCreate(
      data,
      graphQLContext,
    );

    expect(adminProcessorCreateService.execute).toHaveBeenCalledWith({
      data,
      user,
      language: "en",
    });
    expect(result).toBe(processor);
  });

  it("should propagate a failure creating the processor", async () => {
    const error = new Error("create failed");
    adminProcessorCreateService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessorResolver.adminProcessorCreate(
        {} as ProcessorSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should update a processor", async () => {
    const data = { name: "malware-scanner" } as ProcessorSchema;
    adminProcessorUpdateService.execute.mockResolvedValueOnce(processor);

    const result = await adminProcessorResolver.adminProcessorUpdate(
      processor.id,
      data,
      graphQLContext,
    );

    expect(adminProcessorUpdateService.execute).toHaveBeenCalledWith({
      processor_id: processor.id,
      data,
      user,
      language: "en",
    });
    expect(result).toBe(processor);
  });

  it("should propagate a failure updating the processor", async () => {
    const error = new Error("update failed");
    adminProcessorUpdateService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessorResolver.adminProcessorUpdate(
        processor.id,
        {} as ProcessorSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a processor", async () => {
    adminProcessorDeleteService.execute.mockResolvedValueOnce(processor);

    const result = await adminProcessorResolver.adminProcessorDelete(
      processor.id,
      graphQLContext,
    );

    expect(adminProcessorDeleteService.execute).toHaveBeenCalledWith({
      processor_id: processor.id,
      user,
      language: "en",
    });
    expect(result).toBe(processor);
  });

  it("should propagate a failure deleting the processor", async () => {
    const error = new Error("delete failed");
    adminProcessorDeleteService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessorResolver.adminProcessorDelete(processor.id, graphQLContext),
    ).rejects.toThrowError(error);
  });
});

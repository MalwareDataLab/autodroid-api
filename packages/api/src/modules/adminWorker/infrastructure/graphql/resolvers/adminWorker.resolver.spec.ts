import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Entity import
import { PaginatedWorker } from "@modules/worker/entities/worker.entity";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Constant import
import { WorkerSortingOptions } from "@modules/worker/constants/workerSortingOptions.constant";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { AdminWorkerIndexService } from "@modules/adminWorker/services/adminWorkerIndex.service";
import { AdminWorkerShowService } from "@modules/adminWorker/services/adminWorkerShow.service";
import { AdminWorkerUpdateService } from "@modules/adminWorker/services/adminWorkerUpdate.service";
import { AdminWorkerDeleteService } from "@modules/adminWorker/services/adminWorkerDelete.service";
import { AdminWorkerCleanMissingService } from "@modules/adminWorker/services/adminWorkerCleanMissing.service";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import { WorkerIndexSchema } from "@modules/worker/schemas/worker.schema";
import { AdminWorkerUpdateSchema } from "@modules/adminWorker/schemas/adminWorkerUpdate.schema";

// Target import
import { AdminWorkerResolver } from "./adminWorker.resolver";

describe("Resolver: AdminWorkerResolver", () => {
  const user = userFactory.build();
  const worker = workerFactory.build();

  const graphQLContext = {
    user_session: { user },
    language: "en",
  } as GraphQLContext;

  const pagination = { first: 10 } as PaginationSchema;
  const sorting: SortingFieldSchema<typeof WorkerSortingOptions>[] = [
    { field: "created_at", order: SORT_ORDER.DESC },
  ];

  let adminWorkerIndexService: { execute: ReturnType<typeof vi.fn> };
  let adminWorkerShowService: { execute: ReturnType<typeof vi.fn> };
  let adminWorkerUpdateService: { execute: ReturnType<typeof vi.fn> };
  let adminWorkerDeleteService: { execute: ReturnType<typeof vi.fn> };
  let adminWorkerCleanMissingService: { execute: ReturnType<typeof vi.fn> };

  let adminWorkerResolver: AdminWorkerResolver;

  beforeEach(() => {
    adminWorkerIndexService = { execute: vi.fn() };
    adminWorkerShowService = { execute: vi.fn() };
    adminWorkerUpdateService = { execute: vi.fn() };
    adminWorkerDeleteService = { execute: vi.fn() };
    adminWorkerCleanMissingService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminWorkerIndexService) return adminWorkerIndexService;
      if (token === AdminWorkerShowService) return adminWorkerShowService;
      if (token === AdminWorkerUpdateService) return adminWorkerUpdateService;
      if (token === AdminWorkerDeleteService) return adminWorkerDeleteService;
      if (token === AdminWorkerCleanMissingService)
        return adminWorkerCleanMissingService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminWorkerResolver = new AdminWorkerResolver();
  });

  it("should list the workers forwarding filter, pagination and sorting", async () => {
    const filter = { missing: false } as WorkerIndexSchema;
    const paginatedWorkers = {
      edges: [],
      total_count: 0,
    } as unknown as PaginatedWorker;
    adminWorkerIndexService.execute.mockResolvedValueOnce(paginatedWorkers);

    const result = await adminWorkerResolver.adminWorkers(
      filter,
      pagination,
      sorting,
      graphQLContext,
    );

    expect(adminWorkerIndexService.execute).toHaveBeenCalledWith({
      filter,
      pagination,
      sorting,
      user,
      language: "en",
    });
    expect(result).toBe(paginatedWorkers);
  });

  it("should propagate a failure listing the workers", async () => {
    const error = new Error("index failed");
    adminWorkerIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      adminWorkerResolver.adminWorkers(
        {} as WorkerIndexSchema,
        pagination,
        sorting,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should show a worker by id", async () => {
    adminWorkerShowService.execute.mockResolvedValueOnce(worker);

    const result = await adminWorkerResolver.adminWorker(
      worker.id,
      graphQLContext,
    );

    expect(adminWorkerShowService.execute).toHaveBeenCalledWith({
      worker_id: worker.id,
      user,
      language: "en",
    });
    expect(result).toBe(worker);
  });

  it("should propagate a failure showing the worker", async () => {
    const error = new Error("show failed");
    adminWorkerShowService.execute.mockRejectedValueOnce(error);

    await expect(
      adminWorkerResolver.adminWorker(worker.id, graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should update a worker", async () => {
    const data = { description: "edge node" } as AdminWorkerUpdateSchema;
    adminWorkerUpdateService.execute.mockResolvedValueOnce(worker);

    const result = await adminWorkerResolver.adminWorkerUpdate(
      worker.id,
      data,
      graphQLContext,
    );

    expect(adminWorkerUpdateService.execute).toHaveBeenCalledWith({
      worker_id: worker.id,
      data,
      user,
      language: "en",
    });
    expect(result).toBe(worker);
  });

  it("should propagate a failure updating the worker", async () => {
    const error = new Error("update failed");
    adminWorkerUpdateService.execute.mockRejectedValueOnce(error);

    await expect(
      adminWorkerResolver.adminWorkerUpdate(
        worker.id,
        {} as AdminWorkerUpdateSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a worker", async () => {
    adminWorkerDeleteService.execute.mockResolvedValueOnce(worker);

    const result = await adminWorkerResolver.adminWorkerDelete(
      worker.id,
      graphQLContext,
    );

    expect(adminWorkerDeleteService.execute).toHaveBeenCalledWith({
      worker_id: worker.id,
      user,
      language: "en",
    });
    expect(result).toBe(worker);
  });

  it("should propagate a failure deleting the worker", async () => {
    const error = new Error("delete failed");
    adminWorkerDeleteService.execute.mockRejectedValueOnce(error);

    await expect(
      adminWorkerResolver.adminWorkerDelete(worker.id, graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should return the amount of missing workers cleaned", async () => {
    adminWorkerCleanMissingService.execute.mockResolvedValueOnce(4);

    const result =
      await adminWorkerResolver.adminWorkerCleanMissing(graphQLContext);

    expect(adminWorkerCleanMissingService.execute).toHaveBeenCalledWith({
      user,
      language: "en",
    });
    expect(result).toBe(4);
  });

  it("should propagate a failure cleaning the missing workers", async () => {
    const error = new Error("clean failed");
    adminWorkerCleanMissingService.execute.mockRejectedValueOnce(error);

    await expect(
      adminWorkerResolver.adminWorkerCleanMissing(graphQLContext),
    ).rejects.toThrowError(error);
  });
});

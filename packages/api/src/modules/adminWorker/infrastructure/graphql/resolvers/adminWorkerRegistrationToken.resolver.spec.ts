import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Entity import
import { PaginatedWorkerRegistrationToken } from "@modules/worker/entities/workerRegistrationToken.entity";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Constant import
import { WorkerRegistrationTokenSortingOptions } from "@modules/worker/constants/workerRegistrationTokenSortingOptions.constant";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { AdminWorkerRegistrationTokenIndexService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenIndex.service";
import { AdminWorkerRegistrationTokenShowService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenShow.service";
import { AdminWorkerRegistrationTokenCreateService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenCreate.service";
import { AdminWorkerRegistrationTokenDeleteService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenDelete.service";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import {
  WorkerRegistrationTokenIndexSchema,
  WorkerRegistrationTokenCreateSchema,
} from "@modules/worker/schemas/workerRegistrationToken.schema";

// Target import
import { AdminWorkerRegistrationTokenResolver } from "./adminWorkerRegistrationToken.resolver";

describe("Resolver: AdminWorkerRegistrationTokenResolver", () => {
  const user = userFactory.build();
  const workerRegistrationToken = workerRegistrationTokenFactory.build();

  const graphQLContext = {
    user_session: { user },
    language: "en",
  } as GraphQLContext;

  const pagination = { first: 10 } as PaginationSchema;
  const sorting: SortingFieldSchema<
    typeof WorkerRegistrationTokenSortingOptions
  >[] = [{ field: "created_at", order: SORT_ORDER.DESC }];

  let adminWorkerRegistrationTokenIndexService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let adminWorkerRegistrationTokenShowService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let adminWorkerRegistrationTokenCreateService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let adminWorkerRegistrationTokenDeleteService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let adminWorkerRegistrationTokenResolver: AdminWorkerRegistrationTokenResolver;

  beforeEach(() => {
    adminWorkerRegistrationTokenIndexService = { execute: vi.fn() };
    adminWorkerRegistrationTokenShowService = { execute: vi.fn() };
    adminWorkerRegistrationTokenCreateService = { execute: vi.fn() };
    adminWorkerRegistrationTokenDeleteService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminWorkerRegistrationTokenIndexService)
        return adminWorkerRegistrationTokenIndexService;
      if (token === AdminWorkerRegistrationTokenShowService)
        return adminWorkerRegistrationTokenShowService;
      if (token === AdminWorkerRegistrationTokenCreateService)
        return adminWorkerRegistrationTokenCreateService;
      if (token === AdminWorkerRegistrationTokenDeleteService)
        return adminWorkerRegistrationTokenDeleteService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminWorkerRegistrationTokenResolver =
      new AdminWorkerRegistrationTokenResolver();
  });

  it("should list the worker registration tokens forwarding filter, pagination and sorting", async () => {
    const filter = {
      is_unlimited_usage: true,
    } as WorkerRegistrationTokenIndexSchema;
    const paginatedWorkerRegistrationTokens = {
      edges: [],
      total_count: 0,
    } as unknown as PaginatedWorkerRegistrationToken;
    adminWorkerRegistrationTokenIndexService.execute.mockResolvedValueOnce(
      paginatedWorkerRegistrationTokens,
    );

    const result =
      await adminWorkerRegistrationTokenResolver.adminWorkerRegistrationTokens(
        filter,
        pagination,
        sorting,
        graphQLContext,
      );

    expect(
      adminWorkerRegistrationTokenIndexService.execute,
    ).toHaveBeenCalledWith({
      filter,
      pagination,
      sorting,
      user,
      language: "en",
    });
    expect(result).toBe(paginatedWorkerRegistrationTokens);
  });

  it("should propagate a failure listing the worker registration tokens", async () => {
    const error = new Error("index failed");
    adminWorkerRegistrationTokenIndexService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      adminWorkerRegistrationTokenResolver.adminWorkerRegistrationTokens(
        {} as WorkerRegistrationTokenIndexSchema,
        pagination,
        sorting,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should show a worker registration token by id", async () => {
    adminWorkerRegistrationTokenShowService.execute.mockResolvedValueOnce(
      workerRegistrationToken,
    );

    const result =
      await adminWorkerRegistrationTokenResolver.adminWorkerRegistrationToken(
        workerRegistrationToken.id,
        graphQLContext,
      );

    expect(
      adminWorkerRegistrationTokenShowService.execute,
    ).toHaveBeenCalledWith({
      worker_registration_token_id: workerRegistrationToken.id,
      user,
      language: "en",
    });
    expect(result).toBe(workerRegistrationToken);
  });

  it("should propagate a failure showing the worker registration token", async () => {
    const error = new Error("show failed");
    adminWorkerRegistrationTokenShowService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      adminWorkerRegistrationTokenResolver.adminWorkerRegistrationToken(
        workerRegistrationToken.id,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should create a worker registration token", async () => {
    const data = {
      is_unlimited_usage: false,
    } as WorkerRegistrationTokenCreateSchema;
    adminWorkerRegistrationTokenCreateService.execute.mockResolvedValueOnce(
      workerRegistrationToken,
    );

    const result =
      await adminWorkerRegistrationTokenResolver.adminWorkerRegistrationTokenCreate(
        data,
        graphQLContext,
      );

    expect(
      adminWorkerRegistrationTokenCreateService.execute,
    ).toHaveBeenCalledWith({
      data,
      user,
      language: "en",
    });
    expect(result).toBe(workerRegistrationToken);
  });

  it("should propagate a failure creating the worker registration token", async () => {
    const error = new Error("create failed");
    adminWorkerRegistrationTokenCreateService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      adminWorkerRegistrationTokenResolver.adminWorkerRegistrationTokenCreate(
        {} as WorkerRegistrationTokenCreateSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a worker registration token", async () => {
    adminWorkerRegistrationTokenDeleteService.execute.mockResolvedValueOnce(
      workerRegistrationToken,
    );

    const result =
      await adminWorkerRegistrationTokenResolver.adminWorkerRegistrationTokenDelete(
        workerRegistrationToken.id,
        graphQLContext,
      );

    expect(
      adminWorkerRegistrationTokenDeleteService.execute,
    ).toHaveBeenCalledWith({
      worker_registration_token_id: workerRegistrationToken.id,
      user,
      language: "en",
    });
    expect(result).toBe(workerRegistrationToken);
  });

  it("should propagate a failure deleting the worker registration token", async () => {
    const error = new Error("delete failed");
    adminWorkerRegistrationTokenDeleteService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      adminWorkerRegistrationTokenResolver.adminWorkerRegistrationTokenDelete(
        workerRegistrationToken.id,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });
});

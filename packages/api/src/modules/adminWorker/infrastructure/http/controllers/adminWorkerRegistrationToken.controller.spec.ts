import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Schema import
import { WorkerRegistrationTokenIndexSchema } from "@modules/worker/schemas/workerRegistrationToken.schema";

// Service import
import { AdminWorkerRegistrationTokenCreateService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenCreate.service";
import { AdminWorkerRegistrationTokenIndexService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenIndex.service";
import { AdminWorkerRegistrationTokenShowService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenShow.service";
import { AdminWorkerRegistrationTokenDeleteService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenDelete.service";

// Target import
import { AdminWorkerRegistrationTokenController } from "./adminWorkerRegistrationToken.controller";

describe("Controller: AdminWorkerRegistrationTokenController", () => {
  const user = userFactory.build();
  const workerRegistrationToken = workerRegistrationTokenFactory.build();

  const pagination = { skip: 0, take: 10 };
  const sorting = [{ field: "created_at", order: SORT_ORDER.DESC }];

  let adminWorkerRegistrationTokenCreateService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let adminWorkerRegistrationTokenIndexService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let adminWorkerRegistrationTokenShowService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let adminWorkerRegistrationTokenDeleteService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let response: {
    json: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };

  let adminWorkerRegistrationTokenController: AdminWorkerRegistrationTokenController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      params: {},
      query: {},
      body: {},
      pagination,
      sorting,
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    adminWorkerRegistrationTokenCreateService = { execute: vi.fn() };
    adminWorkerRegistrationTokenIndexService = { execute: vi.fn() };
    adminWorkerRegistrationTokenShowService = { execute: vi.fn() };
    adminWorkerRegistrationTokenDeleteService = { execute: vi.fn() };

    response = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminWorkerRegistrationTokenCreateService)
        return adminWorkerRegistrationTokenCreateService;
      if (token === AdminWorkerRegistrationTokenIndexService)
        return adminWorkerRegistrationTokenIndexService;
      if (token === AdminWorkerRegistrationTokenShowService)
        return adminWorkerRegistrationTokenShowService;
      if (token === AdminWorkerRegistrationTokenDeleteService)
        return adminWorkerRegistrationTokenDeleteService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminWorkerRegistrationTokenController =
      new AdminWorkerRegistrationTokenController();
  });

  it("should create a registration token answering 201 with the picked body fields", async () => {
    const expires_at = new Date("2030-01-01T00:00:00.000Z").toISOString();
    adminWorkerRegistrationTokenCreateService.execute.mockResolvedValueOnce(
      workerRegistrationToken,
    );

    const result = await adminWorkerRegistrationTokenController.create(
      buildRequest({
        body: {
          is_unlimited_usage: true,
          expires_at,
          unexpected_field: "ignored",
        },
      }),
      response as unknown as Response,
    );

    expect(
      adminWorkerRegistrationTokenCreateService.execute,
    ).toHaveBeenCalledWith({
      data: { is_unlimited_usage: true, expires_at },
      user,
      language: "en",
    });
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(
      process(workerRegistrationToken),
    );
    expect(result).toBe(response);
  });

  it("should propagate a failure creating a registration token", async () => {
    const error = new Error("create failed");
    adminWorkerRegistrationTokenCreateService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      adminWorkerRegistrationTokenController.create(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.status).not.toHaveBeenCalled();
  });

  it("should index registration tokens building the filter schema from the query", async () => {
    const paginated = { edges: [], total_count: 0 };
    adminWorkerRegistrationTokenIndexService.execute.mockResolvedValueOnce(
      paginated,
    );

    const result = await adminWorkerRegistrationTokenController.index(
      buildRequest({
        query: {
          activatable: true,
          activated: false,
          is_unlimited_usage: true,
          expires_at: "2030-01-01",
          created_at: "2024-01-01",
          updated_at: "2024-02-01",
          archived: false,
          expired: false,
          token: "token-value",
          user_id: user.id,
          unexpected_field: "ignored",
        },
      }),
      response as unknown as Response,
    );

    const [request] =
      adminWorkerRegistrationTokenIndexService.execute.mock.calls[0];

    expect(request.filter).toBeInstanceOf(WorkerRegistrationTokenIndexSchema);
    expect({ ...request.filter }).toEqual({
      activatable: true,
      activated: false,
      is_unlimited_usage: true,
      expires_at: "2030-01-01",
      created_at: "2024-01-01",
      updated_at: "2024-02-01",
      archived: false,
      expired: false,
      token: "token-value",
      user_id: user.id,
    });
    expect(request).toMatchObject({
      sorting,
      pagination,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(paginated));
    expect(result).toBe(response);
  });

  it("should propagate a failure indexing registration tokens", async () => {
    const error = new Error("index failed");
    adminWorkerRegistrationTokenIndexService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      adminWorkerRegistrationTokenController.index(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  it("should show a registration token by the route param", async () => {
    adminWorkerRegistrationTokenShowService.execute.mockResolvedValueOnce(
      workerRegistrationToken,
    );

    const result = await adminWorkerRegistrationTokenController.show(
      buildRequest({
        params: {
          worker_registration_token_id: workerRegistrationToken.id,
        },
      }),
      response as unknown as Response,
    );

    expect(
      adminWorkerRegistrationTokenShowService.execute,
    ).toHaveBeenCalledWith({
      worker_registration_token_id: workerRegistrationToken.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(
      process(workerRegistrationToken),
    );
    expect(result).toBe(response);
  });

  it("should propagate a failure showing a registration token", async () => {
    const error = new Error("show failed");
    adminWorkerRegistrationTokenShowService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      adminWorkerRegistrationTokenController.show(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a registration token by the route param", async () => {
    adminWorkerRegistrationTokenDeleteService.execute.mockResolvedValueOnce(
      workerRegistrationToken,
    );

    const result = await adminWorkerRegistrationTokenController.delete(
      buildRequest({
        params: {
          worker_registration_token_id: workerRegistrationToken.id,
        },
      }),
      response as unknown as Response,
    );

    expect(
      adminWorkerRegistrationTokenDeleteService.execute,
    ).toHaveBeenCalledWith({
      worker_registration_token_id: workerRegistrationToken.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(
      process(workerRegistrationToken),
    );
    expect(result).toBe(response);
  });

  it("should propagate a failure deleting a registration token", async () => {
    const error = new Error("delete failed");
    adminWorkerRegistrationTokenDeleteService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      adminWorkerRegistrationTokenController.delete(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Schema import
import { WorkerIndexSchema } from "@modules/worker/schemas/worker.schema";

// Service import
import { AdminWorkerIndexService } from "@modules/adminWorker/services/adminWorkerIndex.service";
import { AdminWorkerShowService } from "@modules/adminWorker/services/adminWorkerShow.service";
import { AdminWorkerUpdateService } from "@modules/adminWorker/services/adminWorkerUpdate.service";
import { AdminWorkerDeleteService } from "@modules/adminWorker/services/adminWorkerDelete.service";

// Target import
import { AdminWorkerController } from "./adminWorker.controller";

describe("Controller: AdminWorkerController", () => {
  const user = userFactory.build();
  const worker = workerFactory.build();

  const pagination = { skip: 0, take: 25 };
  const sorting = [{ field: "created_at", order: SORT_ORDER.ASC }];

  let adminWorkerIndexService: { execute: ReturnType<typeof vi.fn> };
  let adminWorkerShowService: { execute: ReturnType<typeof vi.fn> };
  let adminWorkerUpdateService: { execute: ReturnType<typeof vi.fn> };
  let adminWorkerDeleteService: { execute: ReturnType<typeof vi.fn> };

  let response: { json: ReturnType<typeof vi.fn> };

  let adminWorkerController: AdminWorkerController;

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
    adminWorkerIndexService = { execute: vi.fn() };
    adminWorkerShowService = { execute: vi.fn() };
    adminWorkerUpdateService = { execute: vi.fn() };
    adminWorkerDeleteService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminWorkerIndexService) return adminWorkerIndexService;
      if (token === AdminWorkerShowService) return adminWorkerShowService;
      if (token === AdminWorkerUpdateService) return adminWorkerUpdateService;
      if (token === AdminWorkerDeleteService) return adminWorkerDeleteService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminWorkerController = new AdminWorkerController();
  });

  it("should index workers building the filter schema from the allowed query keys only", async () => {
    const paginated = { edges: [], total_count: 0 };
    adminWorkerIndexService.execute.mockResolvedValueOnce(paginated);

    const result = await adminWorkerController.index(
      buildRequest({
        query: {
          archived: true,
          user_id: user.id,
          registration_token_id: worker.registration_token_id,
          missing: true,
        },
      }),
      response as unknown as Response,
    );

    const [request] = adminWorkerIndexService.execute.mock.calls[0];

    expect(request.filter).toBeInstanceOf(WorkerIndexSchema);
    expect({ ...request.filter }).toEqual({
      archived: true,
      user_id: user.id,
      registration_token_id: worker.registration_token_id,
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

  it("should propagate a failure indexing workers", async () => {
    const error = new Error("index failed");
    adminWorkerIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      adminWorkerController.index(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  it("should show a worker by the route param", async () => {
    adminWorkerShowService.execute.mockResolvedValueOnce(worker);

    const result = await adminWorkerController.show(
      buildRequest({ params: { worker_id: worker.id } }),
      response as unknown as Response,
    );

    expect(adminWorkerShowService.execute).toHaveBeenCalledWith({
      worker_id: worker.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(worker));
    expect(result).toBe(response);
  });

  it("should propagate a failure showing a worker", async () => {
    const error = new Error("show failed");
    adminWorkerShowService.execute.mockRejectedValueOnce(error);

    await expect(
      adminWorkerController.show(
        buildRequest({ params: { worker_id: worker.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should update a worker forwarding the route param and the whole body", async () => {
    const body = { description: "edge node" };
    adminWorkerUpdateService.execute.mockResolvedValueOnce(worker);

    const result = await adminWorkerController.update(
      buildRequest({ params: { worker_id: worker.id }, body }),
      response as unknown as Response,
    );

    expect(adminWorkerUpdateService.execute).toHaveBeenCalledWith({
      worker_id: worker.id,
      data: body,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(worker));
    expect(result).toBe(response);
  });

  it("should propagate a failure updating a worker", async () => {
    const error = new Error("update failed");
    adminWorkerUpdateService.execute.mockRejectedValueOnce(error);

    await expect(
      adminWorkerController.update(
        buildRequest({ params: { worker_id: worker.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a worker by the route param", async () => {
    adminWorkerDeleteService.execute.mockResolvedValueOnce(worker);

    const result = await adminWorkerController.delete(
      buildRequest({ params: { worker_id: worker.id } }),
      response as unknown as Response,
    );

    expect(adminWorkerDeleteService.execute).toHaveBeenCalledWith({
      worker_id: worker.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(worker));
    expect(result).toBe(response);
  });

  it("should propagate a failure deleting a worker", async () => {
    const error = new Error("delete failed");
    adminWorkerDeleteService.execute.mockRejectedValueOnce(error);

    await expect(
      adminWorkerController.delete(
        buildRequest({ params: { worker_id: worker.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });
});

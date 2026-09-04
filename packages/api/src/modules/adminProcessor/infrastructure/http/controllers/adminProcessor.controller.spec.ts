import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Service import
import { AdminProcessorIndexService } from "@modules/adminProcessor/services/adminProcessorIndex.service";
import { AdminProcessorShowService } from "@modules/adminProcessor/services/adminProcessorShow.service";
import { AdminProcessorCreateService } from "@modules/adminProcessor/services/adminProcessorCreate.service";
import { AdminProcessorUpdateService } from "@modules/adminProcessor/services/adminProcessorUpdate.service";
import { AdminProcessorDeleteService } from "@modules/adminProcessor/services/adminProcessorDelete.service";

// Target import
import { AdminProcessorController } from "./adminProcessor.controller";

describe("Controller: AdminProcessorController", () => {
  const user = userFactory.build();
  const processor = processorFactory.build();

  const pagination = { skip: 0, take: 10 };
  const sorting = [{ field: "created_at", order: SORT_ORDER.DESC }];

  let adminProcessorIndexService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessorShowService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessorCreateService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessorUpdateService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessorDeleteService: { execute: ReturnType<typeof vi.fn> };

  let response: { json: ReturnType<typeof vi.fn> };

  let adminProcessorController: AdminProcessorController;

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
    adminProcessorIndexService = { execute: vi.fn() };
    adminProcessorShowService = { execute: vi.fn() };
    adminProcessorCreateService = { execute: vi.fn() };
    adminProcessorUpdateService = { execute: vi.fn() };
    adminProcessorDeleteService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

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

    adminProcessorController = new AdminProcessorController();
  });

  it("should index processors forwarding the request pagination and sorting", async () => {
    const paginated = { edges: [], total_count: 0 };
    adminProcessorIndexService.execute.mockResolvedValueOnce(paginated);

    const result = await adminProcessorController.index(
      buildRequest(),
      response as unknown as Response,
    );

    expect(adminProcessorIndexService.execute).toHaveBeenCalledWith({
      pagination,
      sorting,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(paginated));
    expect(result).toBe(response);
  });

  it("should propagate a failure indexing processors", async () => {
    const error = new Error("index failed");
    adminProcessorIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessorController.index(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  it("should show a processor by the route param", async () => {
    adminProcessorShowService.execute.mockResolvedValueOnce(processor);

    const result = await adminProcessorController.show(
      buildRequest({ params: { processor_id: processor.id } }),
      response as unknown as Response,
    );

    expect(adminProcessorShowService.execute).toHaveBeenCalledWith({
      processor_id: processor.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(processor));
    expect(result).toBe(response);
  });

  it("should propagate a failure showing a processor", async () => {
    const error = new Error("show failed");
    adminProcessorShowService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessorController.show(
        buildRequest({ params: { processor_id: processor.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should create a processor forwarding the whole body as data", async () => {
    const body = { name: "processor", image_tag: "image:latest" };
    adminProcessorCreateService.execute.mockResolvedValueOnce(processor);

    const result = await adminProcessorController.create(
      buildRequest({ body }),
      response as unknown as Response,
    );

    expect(adminProcessorCreateService.execute).toHaveBeenCalledWith({
      data: body,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(processor));
    expect(result).toBe(response);
  });

  it("should propagate a failure creating a processor", async () => {
    const error = new Error("create failed");
    adminProcessorCreateService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessorController.create(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should update a processor forwarding the route param and the whole body", async () => {
    const body = { name: "renamed" };
    adminProcessorUpdateService.execute.mockResolvedValueOnce(processor);

    const result = await adminProcessorController.update(
      buildRequest({ params: { processor_id: processor.id }, body }),
      response as unknown as Response,
    );

    expect(adminProcessorUpdateService.execute).toHaveBeenCalledWith({
      processor_id: processor.id,
      data: body,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(processor));
    expect(result).toBe(response);
  });

  it("should propagate a failure updating a processor", async () => {
    const error = new Error("update failed");
    adminProcessorUpdateService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessorController.update(
        buildRequest({ params: { processor_id: processor.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a processor by the route param", async () => {
    adminProcessorDeleteService.execute.mockResolvedValueOnce(processor);

    const result = await adminProcessorController.delete(
      buildRequest({ params: { processor_id: processor.id } }),
      response as unknown as Response,
    );

    expect(adminProcessorDeleteService.execute).toHaveBeenCalledWith({
      processor_id: processor.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(processor));
    expect(result).toBe(response);
  });

  it("should propagate a failure deleting a processor", async () => {
    const error = new Error("delete failed");
    adminProcessorDeleteService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessorController.delete(
        buildRequest({ params: { processor_id: processor.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });
});

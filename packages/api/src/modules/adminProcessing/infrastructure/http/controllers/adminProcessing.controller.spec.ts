import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { AdminProcessingIndexService } from "@modules/adminProcessing/services/adminProcessingIndex.service";
import { AdminProcessingShowService } from "@modules/adminProcessing/services/adminProcessingShow.service";
import { AdminProcessingUpdateService } from "@modules/adminProcessing/services/adminProcessingUpdate.service";
import { AdminProcessingDeleteService } from "@modules/adminProcessing/services/adminProcessingDelete.service";

// Target import
import { AdminProcessingController } from "./adminProcessing.controller";

describe("Controller: AdminProcessingController", () => {
  const user = userFactory.build();
  const processing = processingFactory.build();

  let adminProcessingIndexService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessingShowService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessingUpdateService: { execute: ReturnType<typeof vi.fn> };
  let adminProcessingDeleteService: { execute: ReturnType<typeof vi.fn> };

  let response: { json: ReturnType<typeof vi.fn> };

  let adminProcessingController: AdminProcessingController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      params: {},
      query: {},
      body: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    adminProcessingIndexService = { execute: vi.fn() };
    adminProcessingShowService = { execute: vi.fn() };
    adminProcessingUpdateService = { execute: vi.fn() };
    adminProcessingDeleteService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminProcessingIndexService)
        return adminProcessingIndexService;
      if (token === AdminProcessingShowService)
        return adminProcessingShowService;
      if (token === AdminProcessingUpdateService)
        return adminProcessingUpdateService;
      if (token === AdminProcessingDeleteService)
        return adminProcessingDeleteService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminProcessingController = new AdminProcessingController();
  });

  it("should index processings forwarding the raw query as the filter", async () => {
    const processings = [processing];
    const request = buildRequest({ query: { status: "SUCCEEDED" } });
    adminProcessingIndexService.execute.mockResolvedValueOnce(processings);

    const result = await adminProcessingController.index(
      request,
      response as unknown as Response,
    );

    expect(adminProcessingIndexService.execute).toHaveBeenCalledWith({
      filter: { status: "SUCCEEDED" },
      user,
    });
    expect(response.json).toHaveBeenCalledWith(process(processings));
    expect(result).toBe(response);
  });

  it("should propagate a failure indexing processings", async () => {
    const error = new Error("index failed");
    adminProcessingIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessingController.index(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  it("should show a processing by the route param", async () => {
    const request = buildRequest({ params: { processing_id: processing.id } });
    adminProcessingShowService.execute.mockResolvedValueOnce(processing);

    const result = await adminProcessingController.show(
      request,
      response as unknown as Response,
    );

    expect(adminProcessingShowService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(processing));
    expect(result).toBe(response);
  });

  it("should propagate a failure showing a processing", async () => {
    const error = new Error("show failed");
    adminProcessingShowService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessingController.show(
        buildRequest({ params: { processing_id: processing.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should update a processing forwarding the whole body as data", async () => {
    const body = { visibility: "PUBLIC", keep_until: "2030-01-01" };
    const request = buildRequest({
      params: { processing_id: processing.id },
      body,
    });
    adminProcessingUpdateService.execute.mockResolvedValueOnce(processing);

    const result = await adminProcessingController.update(
      request,
      response as unknown as Response,
    );

    expect(adminProcessingUpdateService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      data: body,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(processing));
    expect(result).toBe(response);
  });

  it("should propagate a failure updating a processing", async () => {
    const error = new Error("update failed");
    adminProcessingUpdateService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessingController.update(
        buildRequest({ params: { processing_id: processing.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a processing by the route param", async () => {
    const request = buildRequest({ params: { processing_id: processing.id } });
    adminProcessingDeleteService.execute.mockResolvedValueOnce(processing);

    const result = await adminProcessingController.delete(
      request,
      response as unknown as Response,
    );

    expect(adminProcessingDeleteService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(processing));
    expect(result).toBe(response);
  });

  it("should propagate a failure deleting a processing", async () => {
    const error = new Error("delete failed");
    adminProcessingDeleteService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessingController.delete(
        buildRequest({ params: { processing_id: processing.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Service import
import { UserRequestDatasetProcessingService } from "@modules/processing/services/userRequestDatasetProcessing.service";
import { UserProcessingIndexService } from "@modules/processing/services/userProcessingIndex.service";
import { UserProcessingShowService } from "@modules/processing/services/userProcessingShow.service";
import { UserProcessingDeleteService } from "@modules/processing/services/userProcessingDelete.service";

// Target import
import { UserProcessingController } from "./userProcessing.controller";

describe("Controller: UserProcessingController", () => {
  const user = userFactory.build();
  const processing = processingFactory.build();

  const pagination = { skip: 0, take: 10 };
  const sorting = [{ field: "created_at", order: SORT_ORDER.DESC }];

  let userRequestDatasetProcessingService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let userProcessingIndexService: { execute: ReturnType<typeof vi.fn> };
  let userProcessingShowService: { execute: ReturnType<typeof vi.fn> };
  let userProcessingDeleteService: { execute: ReturnType<typeof vi.fn> };

  let response: { json: ReturnType<typeof vi.fn> };

  let userProcessingController: UserProcessingController;

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
    userRequestDatasetProcessingService = { execute: vi.fn() };
    userProcessingIndexService = { execute: vi.fn() };
    userProcessingShowService = { execute: vi.fn() };
    userProcessingDeleteService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserRequestDatasetProcessingService)
        return userRequestDatasetProcessingService;
      if (token === UserProcessingIndexService)
        return userProcessingIndexService;
      if (token === UserProcessingShowService) return userProcessingShowService;
      if (token === UserProcessingDeleteService)
        return userProcessingDeleteService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userProcessingController = new UserProcessingController();
  });

  it("should request a dataset processing forwarding the whole body as params", async () => {
    const body = {
      dataset_id: "dataset-id",
      processor_id: "processor-id",
      parameters: { a: "1" },
    };
    userRequestDatasetProcessingService.execute.mockResolvedValueOnce(
      processing,
    );

    const result = await userProcessingController.create(
      buildRequest({ body }),
      response as unknown as Response,
    );

    expect(userRequestDatasetProcessingService.execute).toHaveBeenCalledWith({
      params: body,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(processing));
    expect(result).toBe(response);
  });

  it("should propagate a failure requesting a dataset processing", async () => {
    const error = new Error("request failed");
    userRequestDatasetProcessingService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessingController.create(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  it("should index processings forwarding the query as params plus pagination and sorting", async () => {
    const paginated = { edges: [], total_count: 0 };
    userProcessingIndexService.execute.mockResolvedValueOnce(paginated);

    const result = await userProcessingController.index(
      buildRequest({ query: { status: "RUNNING" } }),
      response as unknown as Response,
    );

    expect(userProcessingIndexService.execute).toHaveBeenCalledWith({
      user,
      params: { status: "RUNNING" },
      pagination,
      sorting,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(paginated));
    expect(result).toBe(response);
  });

  it("should propagate a failure indexing processings", async () => {
    const error = new Error("index failed");
    userProcessingIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessingController.index(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should show a processing by the route param", async () => {
    userProcessingShowService.execute.mockResolvedValueOnce(processing);

    const result = await userProcessingController.show(
      buildRequest({ params: { processing_id: processing.id } }),
      response as unknown as Response,
    );

    expect(userProcessingShowService.execute).toHaveBeenCalledWith({
      user,
      processing_id: processing.id,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(processing));
    expect(result).toBe(response);
  });

  it("should propagate a failure showing a processing", async () => {
    const error = new Error("show failed");
    userProcessingShowService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessingController.show(
        buildRequest({ params: { processing_id: processing.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a processing by the route param", async () => {
    userProcessingDeleteService.execute.mockResolvedValueOnce(processing);

    const result = await userProcessingController.delete(
      buildRequest({ params: { processing_id: processing.id } }),
      response as unknown as Response,
    );

    expect(userProcessingDeleteService.execute).toHaveBeenCalledWith({
      user,
      processing_id: processing.id,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(processing));
    expect(result).toBe(response);
  });

  it("should propagate a failure deleting a processing", async () => {
    const error = new Error("delete failed");
    userProcessingDeleteService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessingController.delete(
        buildRequest({ params: { processing_id: processing.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });
});

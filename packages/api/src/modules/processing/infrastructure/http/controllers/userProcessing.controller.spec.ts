import { Request, Response } from "express";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Util import
import { process } from "@shared/utils/instanceParser";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { UserProcessingDeleteService } from "@modules/processing/services/userProcessingDelete.service";
import { UserProcessingIndexService } from "@modules/processing/services/userProcessingIndex.service";
import { UserProcessingShowService } from "@modules/processing/services/userProcessingShow.service";
import { UserRequestDatasetProcessingService } from "@modules/processing/services/userRequestDatasetProcessing.service";

// Target import
import { UserProcessingController } from "./userProcessing.controller";

describe("Controller: UserProcessingController", () => {
  const user = userFactory.build();
  const otherUser = userFactory.build();
  const processing = processingFactory.build(
    {},
    {
      associations: {
        user,
        dataset: datasetFactory.build(
          {},
          { associations: { user: otherUser } },
        ),
      },
    },
  );
  const processingWithVisibleOwners = Object.assign(
    new Processing(),
    processing,
    {
      dataset: Object.assign(new Dataset(), processing.dataset, { user: null }),
    },
  );

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
    expect(response.json).toHaveBeenCalledWith(
      process(processingWithVisibleOwners),
    );
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

  it("should index processings forwarding the query as params, its boolean strings read as booleans, plus pagination and sorting", async () => {
    const otherUserProcessing = processingFactory.build(
      {},
      {
        associations: {
          user: otherUser,
          dataset: datasetFactory.build(
            {},
            { associations: { user: otherUser } },
          ),
        },
      },
    );
    const paginated = {
      edges: [
        { cursor: "own-cursor", node: processing },
        { cursor: "other-cursor", node: otherUserProcessing },
      ],
      totalCount: 2,
    };
    userProcessingIndexService.execute.mockResolvedValueOnce(paginated);

    const result = await userProcessingController.index(
      buildRequest({
        query: { status: "RUNNING", started: "true", finished: "false" },
      }),
      response as unknown as Response,
    );

    expect(userProcessingIndexService.execute).toHaveBeenCalledWith({
      user,
      params: { status: "RUNNING", started: true, finished: false },
      pagination,
      sorting,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(
      process({
        ...paginated,
        edges: [
          { cursor: "own-cursor", node: processingWithVisibleOwners },
          {
            cursor: "other-cursor",
            node: Object.assign(new Processing(), otherUserProcessing, {
              user: null,
              dataset: Object.assign(
                new Dataset(),
                otherUserProcessing.dataset,
                { user: null },
              ),
            }),
          },
        ],
      }),
    );
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
    expect(response.json).toHaveBeenCalledWith(
      process(processingWithVisibleOwners),
    );
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
    expect(response.json).toHaveBeenCalledWith(
      process(processingWithVisibleOwners),
    );
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

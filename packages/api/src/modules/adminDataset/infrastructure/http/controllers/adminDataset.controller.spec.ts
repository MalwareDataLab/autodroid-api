import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { AdminDatasetIndexService } from "@modules/adminDataset/services/adminDatasetIndex.service";
import { AdminDatasetShowService } from "@modules/adminDataset/services/adminDatasetShow.service";
import { AdminDatasetUpdateService } from "@modules/adminDataset/services/adminDatasetUpdate.service";
import { AdminDatasetDeleteService } from "@modules/adminDataset/services/adminDatasetDelete.service";

// Target import
import { AdminDatasetController } from "./adminDataset.controller";

describe("Controller: AdminDatasetController", () => {
  const user = userFactory.build();
  const dataset = datasetFactory.build();

  let adminDatasetIndexService: { execute: ReturnType<typeof vi.fn> };
  let adminDatasetShowService: { execute: ReturnType<typeof vi.fn> };
  let adminDatasetUpdateService: { execute: ReturnType<typeof vi.fn> };
  let adminDatasetDeleteService: { execute: ReturnType<typeof vi.fn> };

  let response: {
    json: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };

  let adminDatasetController: AdminDatasetController;

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
    adminDatasetIndexService = { execute: vi.fn() };
    adminDatasetShowService = { execute: vi.fn() };
    adminDatasetUpdateService = { execute: vi.fn() };
    adminDatasetDeleteService = { execute: vi.fn() };

    response = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminDatasetIndexService) return adminDatasetIndexService;
      if (token === AdminDatasetShowService) return adminDatasetShowService;
      if (token === AdminDatasetUpdateService) return adminDatasetUpdateService;
      if (token === AdminDatasetDeleteService) return adminDatasetDeleteService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminDatasetController = new AdminDatasetController();
  });

  it("should index datasets forwarding the raw query as the filter", async () => {
    const datasets = [dataset];
    const request = buildRequest({ query: { archived: "true" } });
    adminDatasetIndexService.execute.mockResolvedValueOnce(datasets);

    const result = await adminDatasetController.index(
      request,
      response as unknown as Response,
    );

    expect(adminDatasetIndexService.execute).toHaveBeenCalledWith({
      filter: { archived: "true" },
      user,
    });
    expect(response.json).toHaveBeenCalledWith(process(datasets));
    expect(result).toBe(response);
  });

  it("should propagate a failure indexing datasets", async () => {
    const error = new Error("index failed");
    adminDatasetIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      adminDatasetController.index(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  it("should show a dataset by the route param", async () => {
    const request = buildRequest({ params: { dataset_id: dataset.id } });
    adminDatasetShowService.execute.mockResolvedValueOnce(dataset);

    const result = await adminDatasetController.show(
      request,
      response as unknown as Response,
    );

    expect(adminDatasetShowService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(dataset));
    expect(result).toBe(response);
  });

  it("should propagate a failure showing a dataset", async () => {
    const error = new Error("show failed");
    adminDatasetShowService.execute.mockRejectedValueOnce(error);

    await expect(
      adminDatasetController.show(
        buildRequest({ params: { dataset_id: dataset.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should update only the description and tags of a dataset", async () => {
    const request = buildRequest({
      params: { dataset_id: dataset.id },
      body: {
        description: "new description",
        tags: "a,b",
        unexpected_field: "ignored",
      },
    });
    adminDatasetUpdateService.execute.mockResolvedValueOnce(dataset);

    const result = await adminDatasetController.update(
      request,
      response as unknown as Response,
    );

    expect(adminDatasetUpdateService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      data: { description: "new description", tags: "a,b" },
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(dataset));
    expect(result).toBe(response);
  });

  it("should update a dataset with undefined description and tags when absent from the body", async () => {
    const request = buildRequest({ params: { dataset_id: dataset.id } });
    adminDatasetUpdateService.execute.mockResolvedValueOnce(dataset);

    await adminDatasetController.update(
      request,
      response as unknown as Response,
    );

    expect(adminDatasetUpdateService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      data: { description: undefined, tags: undefined },
      user,
      language: "en",
    });
  });

  it("should propagate a failure updating a dataset", async () => {
    const error = new Error("update failed");
    adminDatasetUpdateService.execute.mockRejectedValueOnce(error);

    await expect(
      adminDatasetController.update(
        buildRequest({ params: { dataset_id: dataset.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a dataset by the route param", async () => {
    const request = buildRequest({ params: { dataset_id: dataset.id } });
    adminDatasetDeleteService.execute.mockResolvedValueOnce(dataset);

    const result = await adminDatasetController.delete(
      request,
      response as unknown as Response,
    );

    expect(adminDatasetDeleteService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(dataset));
    expect(result).toBe(response);
  });

  it("should propagate a failure deleting a dataset", async () => {
    const error = new Error("delete failed");
    adminDatasetDeleteService.execute.mockRejectedValueOnce(error);

    await expect(
      adminDatasetController.delete(
        buildRequest({ params: { dataset_id: dataset.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });
});

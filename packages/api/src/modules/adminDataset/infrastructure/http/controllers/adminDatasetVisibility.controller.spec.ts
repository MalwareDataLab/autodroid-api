import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { AdminDatasetUpdateVisibilityService } from "@modules/adminDataset/services/adminDatasetUpdateVisibility.service";

// Target import
import { AdminDatasetVisibilityController } from "./adminDatasetVisibility.controller";

describe("Controller: AdminDatasetVisibilityController", () => {
  const user = userFactory.build();
  const dataset = datasetFactory.build();

  let adminDatasetUpdateVisibilityService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let response: { json: ReturnType<typeof vi.fn> };

  let adminDatasetVisibilityController: AdminDatasetVisibilityController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      params: {},
      body: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    adminDatasetUpdateVisibilityService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminDatasetUpdateVisibilityService)
        return adminDatasetUpdateVisibilityService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminDatasetVisibilityController = new AdminDatasetVisibilityController();
  });

  it("should forward the whole body as the visibility payload", async () => {
    const body = { visibility: "PUBLIC" };
    const request = buildRequest({
      params: { dataset_id: dataset.id },
      body,
    });
    adminDatasetUpdateVisibilityService.execute.mockResolvedValueOnce(dataset);

    const result = await adminDatasetVisibilityController.update(
      request,
      response as unknown as Response,
    );

    expect(adminDatasetUpdateVisibilityService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      data: body,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(dataset));
    expect(result).toBe(response);
  });

  it("should propagate a failure updating the dataset visibility", async () => {
    const error = new Error("visibility update failed");
    adminDatasetUpdateVisibilityService.execute.mockRejectedValueOnce(error);

    await expect(
      adminDatasetVisibilityController.update(
        buildRequest({ params: { dataset_id: dataset.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});

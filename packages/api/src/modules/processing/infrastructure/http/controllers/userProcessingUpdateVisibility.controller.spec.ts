import { Request, Response } from "express";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Util import
import { process } from "@shared/utils/instanceParser";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { UserProcessingUpdateVisibilityService } from "@modules/processing/services/userProcessingUpdateVisibility.service";

// Target import
import { UserProcessingUpdateVisibilityController } from "./userProcessingUpdateVisibility.controller";

describe("Controller: UserProcessingUpdateVisibilityController", () => {
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

  let userProcessingUpdateVisibilityService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let response: { json: ReturnType<typeof vi.fn> };

  let userProcessingUpdateVisibilityController: UserProcessingUpdateVisibilityController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      params: {},
      body: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    userProcessingUpdateVisibilityService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserProcessingUpdateVisibilityService)
        return userProcessingUpdateVisibilityService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userProcessingUpdateVisibilityController =
      new UserProcessingUpdateVisibilityController();
  });

  it("should update the visibility picking it from the body", async () => {
    userProcessingUpdateVisibilityService.execute.mockResolvedValueOnce(
      processing,
    );

    const result = await userProcessingUpdateVisibilityController.update(
      buildRequest({
        params: { processing_id: processing.id },
        body: { visibility: "PUBLIC", unexpected_field: "ignored" },
      }),
      response as unknown as Response,
    );

    expect(userProcessingUpdateVisibilityService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      visibility: "PUBLIC",
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(
      process(processingWithVisibleOwners),
    );
    expect(result).toBe(response);
  });

  it("should forward an undefined visibility when it is absent from the body", async () => {
    userProcessingUpdateVisibilityService.execute.mockResolvedValueOnce(
      processing,
    );

    await userProcessingUpdateVisibilityController.update(
      buildRequest({ params: { processing_id: processing.id } }),
      response as unknown as Response,
    );

    expect(userProcessingUpdateVisibilityService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      visibility: undefined,
      user,
      language: "en",
    });
  });

  it("should propagate a failure updating the processing visibility", async () => {
    const error = new Error("visibility update failed");
    userProcessingUpdateVisibilityService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessingUpdateVisibilityController.update(
        buildRequest({ params: { processing_id: processing.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});

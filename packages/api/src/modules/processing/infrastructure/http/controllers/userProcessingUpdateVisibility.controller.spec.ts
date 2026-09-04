import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserProcessingUpdateVisibilityService } from "@modules/processing/services/userProcessingUpdateVisibility.service";

// Target import
import { UserProcessingUpdateVisibilityController } from "./userProcessingUpdateVisibility.controller";

describe("Controller: UserProcessingUpdateVisibilityController", () => {
  const user = userFactory.build();
  const processing = processingFactory.build();

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
    expect(response.json).toHaveBeenCalledWith(process(processing));
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

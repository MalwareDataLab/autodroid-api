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
import { UserProcessingExtendKeepUntilService } from "@modules/processing/services/userProcessingExtendKeepUntil.service";

// Target import
import { UserProcessingExtendKeepUntilController } from "./userProcessingExtendKeepUntil.controller";

describe("Controller: UserProcessingExtendKeepUntilController", () => {
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

  let userProcessingExtendKeepUntilService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let response: { json: ReturnType<typeof vi.fn> };

  let userProcessingExtendKeepUntilController: UserProcessingExtendKeepUntilController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      params: {},
      body: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    userProcessingExtendKeepUntilService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserProcessingExtendKeepUntilService)
        return userProcessingExtendKeepUntilService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userProcessingExtendKeepUntilController =
      new UserProcessingExtendKeepUntilController();
  });

  it("should extend the keep until date picking it from the body", async () => {
    const keep_until = "2030-01-01T00:00:00.000Z";
    userProcessingExtendKeepUntilService.execute.mockResolvedValueOnce(
      processing,
    );

    const result = await userProcessingExtendKeepUntilController.update(
      buildRequest({
        params: { processing_id: processing.id },
        body: { keep_until, unexpected_field: "ignored" },
      }),
      response as unknown as Response,
    );

    expect(userProcessingExtendKeepUntilService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      keep_until,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(
      process(processingWithVisibleOwners),
    );
    expect(result).toBe(response);
  });

  it("should forward an undefined keep until when it is absent from the body", async () => {
    userProcessingExtendKeepUntilService.execute.mockResolvedValueOnce(
      processing,
    );

    await userProcessingExtendKeepUntilController.update(
      buildRequest({ params: { processing_id: processing.id } }),
      response as unknown as Response,
    );

    expect(userProcessingExtendKeepUntilService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      keep_until: undefined,
      user,
      language: "en",
    });
  });

  it("should propagate a failure extending the keep until date", async () => {
    const error = new Error("extend failed");
    userProcessingExtendKeepUntilService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessingExtendKeepUntilController.update(
        buildRequest({ params: { processing_id: processing.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});

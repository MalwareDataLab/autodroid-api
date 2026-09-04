import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { AdminWorkerCleanMissingService } from "@modules/adminWorker/services/adminWorkerCleanMissing.service";

// Target import
import { AdminWorkerCleanMissingController } from "./adminWorkerCleanMissing.controller";

describe("Controller: AdminWorkerCleanMissingController", () => {
  const user = userFactory.build();

  let adminWorkerCleanMissingService: { execute: ReturnType<typeof vi.fn> };

  let response: {
    json: ReturnType<typeof vi.fn>;
    sendStatus: ReturnType<typeof vi.fn>;
  };

  let adminWorkerCleanMissingController: AdminWorkerCleanMissingController;

  const buildRequest = () =>
    ({
      user_session: { user },
      language: "en",
    }) as unknown as Request;

  beforeEach(() => {
    adminWorkerCleanMissingService = { execute: vi.fn() };

    response = {
      json: vi.fn().mockReturnThis(),
      sendStatus: vi.fn().mockReturnThis(),
    };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminWorkerCleanMissingService)
        return adminWorkerCleanMissingService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminWorkerCleanMissingController = new AdminWorkerCleanMissingController();
  });

  it("should clean the missing workers and answer with a bare 200 status", async () => {
    adminWorkerCleanMissingService.execute.mockResolvedValueOnce(undefined);

    const result = await adminWorkerCleanMissingController.delete(
      buildRequest(),
      response as unknown as Response,
    );

    expect(adminWorkerCleanMissingService.execute).toHaveBeenCalledWith({
      user,
      language: "en",
    });
    expect(response.sendStatus).toHaveBeenCalledWith(200);
    expect(response.json).not.toHaveBeenCalled();
    expect(result).toBe(response);
  });

  it("should propagate a failure cleaning the missing workers", async () => {
    const error = new Error("clean failed");
    adminWorkerCleanMissingService.execute.mockRejectedValueOnce(error);

    await expect(
      adminWorkerCleanMissingController.delete(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.sendStatus).not.toHaveBeenCalled();
  });
});

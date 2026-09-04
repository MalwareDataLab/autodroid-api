import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { AdminProcessingCleanExpiredService } from "@modules/adminProcessing/services/adminProcessingCleanExpired.service";

// Target import
import { AdminProcessingCleanExpiredController } from "./adminProcessingCleanExpired.controller";

describe("Controller: AdminProcessingCleanExpiredController", () => {
  const user = userFactory.build();

  let adminProcessingCleanExpiredService: { execute: ReturnType<typeof vi.fn> };

  let response: {
    json: ReturnType<typeof vi.fn>;
    sendStatus: ReturnType<typeof vi.fn>;
  };

  let adminProcessingCleanExpiredController: AdminProcessingCleanExpiredController;

  const buildRequest = () =>
    ({
      user_session: { user },
      language: "pt",
    }) as unknown as Request;

  beforeEach(() => {
    adminProcessingCleanExpiredService = { execute: vi.fn() };

    response = {
      json: vi.fn().mockReturnThis(),
      sendStatus: vi.fn().mockReturnThis(),
    };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminProcessingCleanExpiredService)
        return adminProcessingCleanExpiredService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminProcessingCleanExpiredController =
      new AdminProcessingCleanExpiredController();
  });

  it("should clean the expired processings and answer with a bare 200 status", async () => {
    adminProcessingCleanExpiredService.execute.mockResolvedValueOnce(undefined);

    const result = await adminProcessingCleanExpiredController.delete(
      buildRequest(),
      response as unknown as Response,
    );

    expect(adminProcessingCleanExpiredService.execute).toHaveBeenCalledWith({
      user,
      language: "pt",
    });
    expect(response.sendStatus).toHaveBeenCalledWith(200);
    expect(response.json).not.toHaveBeenCalled();
    expect(result).toBe(response);
  });

  it("should propagate a failure cleaning the expired processings", async () => {
    const error = new Error("clean failed");
    adminProcessingCleanExpiredService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessingCleanExpiredController.delete(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.sendStatus).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { AdminProcessingFailDanglingService } from "@modules/adminProcessing/services/adminProcessingFailDangling.service";

// Target import
import { AdminProcessingFailDanglingController } from "./adminProcessingFailDangling.controller";

describe("Controller: AdminProcessingFailDanglingController", () => {
  const user = userFactory.build();

  let adminProcessingFailDanglingService: { execute: ReturnType<typeof vi.fn> };

  let response: {
    json: ReturnType<typeof vi.fn>;
    sendStatus: ReturnType<typeof vi.fn>;
  };

  let adminProcessingFailDanglingController: AdminProcessingFailDanglingController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      body: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    adminProcessingFailDanglingService = { execute: vi.fn() };

    response = {
      json: vi.fn().mockReturnThis(),
      sendStatus: vi.fn().mockReturnThis(),
    };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminProcessingFailDanglingService)
        return adminProcessingFailDanglingService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminProcessingFailDanglingController =
      new AdminProcessingFailDanglingController();
  });

  it("should forward the body as params and answer with a bare 200 status", async () => {
    const body = { max_age_in_minutes: 30 };
    adminProcessingFailDanglingService.execute.mockResolvedValueOnce(undefined);

    const result = await adminProcessingFailDanglingController.update(
      buildRequest({ body }),
      response as unknown as Response,
    );

    expect(adminProcessingFailDanglingService.execute).toHaveBeenCalledWith({
      user,
      params: body,
      language: "en",
    });
    expect(response.sendStatus).toHaveBeenCalledWith(200);
    expect(response.json).not.toHaveBeenCalled();
    expect(result).toBe(response);
  });

  it("should propagate a failure failing the dangling processings", async () => {
    const error = new Error("fail dangling failed");
    adminProcessingFailDanglingService.execute.mockRejectedValueOnce(error);

    await expect(
      adminProcessingFailDanglingController.update(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.sendStatus).not.toHaveBeenCalled();
  });
});

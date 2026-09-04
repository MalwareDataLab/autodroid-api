import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { AdminFileRemoveAllDanglingService } from "@modules/adminFile/services/adminFileRemoveAllDangling.service";

// Target import
import { AdminRemoveAllDanglingFilesController } from "./adminRemoveAllDanglingFiles.controller";

describe("Controller: AdminRemoveAllDanglingFilesController", () => {
  const user = userFactory.build();

  let adminFileRemoveAllDanglingService: { execute: ReturnType<typeof vi.fn> };

  let response: {
    json: ReturnType<typeof vi.fn>;
    sendStatus: ReturnType<typeof vi.fn>;
  };

  let adminRemoveAllDanglingFilesController: AdminRemoveAllDanglingFilesController;

  const buildRequest = () =>
    ({
      user_session: { user },
      language: "en",
    }) as unknown as Request;

  beforeEach(() => {
    adminFileRemoveAllDanglingService = { execute: vi.fn() };

    response = {
      json: vi.fn().mockReturnThis(),
      sendStatus: vi.fn().mockReturnThis(),
    };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminFileRemoveAllDanglingService)
        return adminFileRemoveAllDanglingService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminRemoveAllDanglingFilesController =
      new AdminRemoveAllDanglingFilesController();
  });

  it("should remove all dangling files and answer with a bare 200 status", async () => {
    adminFileRemoveAllDanglingService.execute.mockResolvedValueOnce(undefined);

    const result = await adminRemoveAllDanglingFilesController.delete(
      buildRequest(),
      response as unknown as Response,
    );

    expect(adminFileRemoveAllDanglingService.execute).toHaveBeenCalledWith({
      user,
      language: "en",
    });
    expect(response.sendStatus).toHaveBeenCalledWith(200);
    expect(response.json).not.toHaveBeenCalled();
    expect(result).toBe(response);
  });

  it("should propagate a failure removing the dangling files", async () => {
    const error = new Error("cleanup failed");
    adminFileRemoveAllDanglingService.execute.mockRejectedValueOnce(error);

    await expect(
      adminRemoveAllDanglingFilesController.delete(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.sendStatus).not.toHaveBeenCalled();
  });
});

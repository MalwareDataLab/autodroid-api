import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { WorkerUpdateRefreshTokenService } from "@modules/worker/services/workerUpdateRefreshToken.service";

// Target import
import { WorkerUpdateRefreshTokenController } from "./workerUpdateRefreshToken.controller";

describe("Controller: WorkerUpdateRefreshTokenController", () => {
  const worker = workerFactory.build();

  const agent_info = { ip: "10.0.0.5", browser: "worker-agent" };

  let workerUpdateRefreshTokenService: { execute: ReturnType<typeof vi.fn> };

  let response: { json: ReturnType<typeof vi.fn> };

  let workerUpdateRefreshTokenController: WorkerUpdateRefreshTokenController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      body: {},
      agent_info,
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    workerUpdateRefreshTokenService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === WorkerUpdateRefreshTokenService)
        return workerUpdateRefreshTokenService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    workerUpdateRefreshTokenController =
      new WorkerUpdateRefreshTokenController();
  });

  it("should update the refresh token forwarding the whole body and the agent info", async () => {
    const body = {
      worker_id: worker.id,
      refresh_token: "current-refresh-token",
    };
    workerUpdateRefreshTokenService.execute.mockResolvedValueOnce(worker);

    const result = await workerUpdateRefreshTokenController.update(
      buildRequest({ body }),
      response as unknown as Response,
    );

    expect(workerUpdateRefreshTokenService.execute).toHaveBeenCalledWith({
      data: body,
      agent_info,
    });
    expect(response.json).toHaveBeenCalledWith(process(worker));
    expect(result).toBe(response);
  });

  it("should forward an undefined agent info when the request carries none", async () => {
    workerUpdateRefreshTokenService.execute.mockResolvedValueOnce(worker);

    await workerUpdateRefreshTokenController.update(
      buildRequest({ agent_info: undefined }),
      response as unknown as Response,
    );

    expect(workerUpdateRefreshTokenService.execute).toHaveBeenCalledWith({
      data: {},
      agent_info: undefined,
    });
  });

  it("should propagate a failure updating the refresh token", async () => {
    const error = new Error("refresh failed");
    workerUpdateRefreshTokenService.execute.mockRejectedValueOnce(error);

    await expect(
      workerUpdateRefreshTokenController.update(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});

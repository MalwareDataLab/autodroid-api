import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { WorkerGenerateAccessTokenService } from "@modules/worker/services/workerGenerateAccessToken.service";

// Target import
import { WorkerGenerateAccessTokenController } from "./workerGenerateAccessToken.controller";

describe("Controller: WorkerGenerateAccessTokenController", () => {
  const agent_info = { ip: "10.0.0.1", browser: "worker-agent" };

  let workerGenerateAccessTokenService: { execute: ReturnType<typeof vi.fn> };

  let response: { json: ReturnType<typeof vi.fn> };

  let workerGenerateAccessTokenController: WorkerGenerateAccessTokenController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      body: {},
      agent_info,
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    workerGenerateAccessTokenService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === WorkerGenerateAccessTokenService)
        return workerGenerateAccessTokenService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    workerGenerateAccessTokenController =
      new WorkerGenerateAccessTokenController();
  });

  it("should generate an access token forwarding the whole body and the agent info", async () => {
    const body = { worker_id: "worker-id", refresh_token: "refresh-token" };
    const accessToken = {
      access_token: "access-token",
      expires_at: new Date("2030-01-01"),
    };
    workerGenerateAccessTokenService.execute.mockResolvedValueOnce(accessToken);

    const result = await workerGenerateAccessTokenController.update(
      buildRequest({ body }),
      response as unknown as Response,
    );

    expect(workerGenerateAccessTokenService.execute).toHaveBeenCalledWith({
      data: body,
      agent_info,
    });
    expect(response.json).toHaveBeenCalledWith(process(accessToken));
    expect(result).toBe(response);
  });

  it("should forward an undefined agent info when the request carries none", async () => {
    workerGenerateAccessTokenService.execute.mockResolvedValueOnce({});

    await workerGenerateAccessTokenController.update(
      buildRequest({ agent_info: undefined }),
      response as unknown as Response,
    );

    expect(workerGenerateAccessTokenService.execute).toHaveBeenCalledWith({
      data: {},
      agent_info: undefined,
    });
  });

  it("should propagate a failure generating the access token", async () => {
    const error = new Error("token generation failed");
    workerGenerateAccessTokenService.execute.mockRejectedValueOnce(error);

    await expect(
      workerGenerateAccessTokenController.update(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});

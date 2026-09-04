import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { WorkerRegisterService } from "@modules/worker/services/workerRegister.service";

// Target import
import { WorkerRegisterController } from "./workerRegister.controller";

describe("Controller: WorkerRegisterController", () => {
  const worker = workerFactory.build();

  const agent_info = { ip: "10.0.0.4", browser: "worker-agent" };

  let workerRegisterService: { execute: ReturnType<typeof vi.fn> };

  let response: { json: ReturnType<typeof vi.fn> };

  let workerRegisterController: WorkerRegisterController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      body: {},
      agent_info,
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    workerRegisterService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === WorkerRegisterService) return workerRegisterService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    workerRegisterController = new WorkerRegisterController();
  });

  it("should register a worker forwarding the whole body and the agent info", async () => {
    const body = {
      name: worker.name,
      internal_id: worker.internal_id,
      signature: worker.signature,
      registration_token: "registration-token",
      system_info: { os: "Linux" },
    };
    workerRegisterService.execute.mockResolvedValueOnce(worker);

    const result = await workerRegisterController.create(
      buildRequest({ body }),
      response as unknown as Response,
    );

    expect(workerRegisterService.execute).toHaveBeenCalledWith({
      data: body,
      agent_info,
    });
    expect(response.json).toHaveBeenCalledWith(process(worker));
    expect(result).toBe(response);
  });

  it("should forward an undefined agent info when the request carries none", async () => {
    workerRegisterService.execute.mockResolvedValueOnce(worker);

    await workerRegisterController.create(
      buildRequest({ agent_info: undefined }),
      response as unknown as Response,
    );

    expect(workerRegisterService.execute).toHaveBeenCalledWith({
      data: {},
      agent_info: undefined,
    });
  });

  it("should propagate a failure registering the worker", async () => {
    const error = new Error("register failed");
    workerRegisterService.execute.mockRejectedValueOnce(error);

    await expect(
      workerRegisterController.create(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});

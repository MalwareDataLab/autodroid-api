import { beforeEach, describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Target import
import { WorkerController } from "./worker.controller";

describe("Controller: WorkerController", () => {
  const worker = workerFactory.build();

  let response: { json: ReturnType<typeof vi.fn> };

  let workerController: WorkerController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      worker_session: { worker },
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    response = { json: vi.fn().mockReturnThis() };

    workerController = new WorkerController();
  });

  it("should answer the worker attached to the request session", async () => {
    const result = await workerController.show(
      buildRequest(),
      response as unknown as Response,
    );

    expect(response.json).toHaveBeenCalledWith(process(worker));
    expect(result).toBe(response);
  });

  it("should answer null when the request session carries no worker", async () => {
    await workerController.show(
      buildRequest({ worker_session: { worker: undefined } }),
      response as unknown as Response,
    );

    expect(response.json).toHaveBeenCalledWith(null);
  });
});

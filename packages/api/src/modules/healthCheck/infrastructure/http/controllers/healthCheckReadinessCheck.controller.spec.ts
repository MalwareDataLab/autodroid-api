import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Service import
import { HealthCheckReadinessCheckService } from "@modules/healthCheck/services/healthCheckReadinessCheck.service";

// Target import
import { HealthCheckReadinessCheckController } from "./healthCheckReadinessCheck.controller";

describe("Controller: HealthCheckReadinessCheckController", () => {
  let healthCheckReadinessCheckService: { execute: ReturnType<typeof vi.fn> };

  let response: {
    status: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };

  let healthCheckReadinessCheckController: HealthCheckReadinessCheckController;

  const buildRequest = () => ({}) as unknown as Request;

  beforeEach(() => {
    healthCheckReadinessCheckService = { execute: vi.fn() };

    response = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === HealthCheckReadinessCheckService)
        return healthCheckReadinessCheckService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    healthCheckReadinessCheckController =
      new HealthCheckReadinessCheckController();
  });

  it("should answer 200 with an empty body when the readiness check succeeds", async () => {
    healthCheckReadinessCheckService.execute.mockResolvedValueOnce(undefined);

    const result = await healthCheckReadinessCheckController.show(
      buildRequest(),
      response as unknown as Response,
    );

    expect(healthCheckReadinessCheckService.execute).toHaveBeenCalledWith();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith();
    expect(result).toBe(response);
  });

  it("should propagate a failure of the readiness check without answering", async () => {
    const error = new Error("not ready");
    healthCheckReadinessCheckService.execute.mockRejectedValueOnce(error);

    await expect(
      healthCheckReadinessCheckController.show(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.status).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
  });
});

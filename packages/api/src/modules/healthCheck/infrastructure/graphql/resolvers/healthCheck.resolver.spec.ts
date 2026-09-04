import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Service import
import { HealthCheckReadinessCheckService } from "@modules/healthCheck/services/healthCheckReadinessCheck.service";

// Target import
import { HealthCheckResolver } from "./healthCheck.resolver";

describe("Resolver: HealthCheckResolver", () => {
  const now = new Date("2024-05-04T10:00:00.000Z");

  let healthCheckReadinessCheckService: { execute: ReturnType<typeof vi.fn> };

  let healthCheckResolver: HealthCheckResolver;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    healthCheckReadinessCheckService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === HealthCheckReadinessCheckService)
        return healthCheckReadinessCheckService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    healthCheckResolver = new HealthCheckResolver();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the current date without resolving any service", async () => {
    const result = await healthCheckResolver.healthCheck();

    expect(result).toEqual(now);
    expect(container.resolve).not.toHaveBeenCalled();
  });

  it("should return the current date after the readiness check succeeds", async () => {
    healthCheckReadinessCheckService.execute.mockResolvedValueOnce(undefined);

    const result = await healthCheckResolver.healthReadinessCheck();

    expect(healthCheckReadinessCheckService.execute).toHaveBeenCalledWith();
    expect(result).toEqual(now);
  });

  it("should propagate a failure of the readiness check", async () => {
    const error = new Error("readiness failed");
    healthCheckReadinessCheckService.execute.mockRejectedValueOnce(error);

    await expect(
      healthCheckResolver.healthReadinessCheck(),
    ).rejects.toThrowError(error);
  });

  it("should return the current date for the liveness check without resolving any service", async () => {
    const result = await healthCheckResolver.healthLivenessCheck();

    expect(result).toEqual(now);
    expect(container.resolve).not.toHaveBeenCalled();
  });
});

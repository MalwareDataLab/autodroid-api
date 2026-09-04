import { describe, expect, it } from "vitest";

describe("E2E: HealthCheckReadinessCheckController", () => {
  it("should return ok on the health root", async context => {
    const response = await context.request.get("/health").send();

    expect(response.status).toBe(200);
  });

  it("should return ok on the readiness check", async context => {
    const response = await context.request.get("/health/readiness").send();

    expect(response.status).toBe(200);
  });

  it("should return ok on the liveness check", async context => {
    const response = await context.request.get("/health/liveness").send();

    expect(response.status).toBe(200);
  });
});

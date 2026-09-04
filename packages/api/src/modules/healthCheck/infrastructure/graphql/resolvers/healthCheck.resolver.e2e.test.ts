import { gql } from "@/test/utils/gql.util";
import { describe, expect, it } from "vitest";

describe("E2E: HealthCheckResolver", () => {
  it("should return the health check date", async context => {
    const response = await context.request.post("/graphql").send({
      query: gql`
        query HealthCheck {
          healthCheck
        }
      `,
    });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.healthCheck).toEqual(expect.any(String));
  });

  it("should return the readiness check date", async context => {
    const response = await context.request.post("/graphql").send({
      query: gql`
        query HealthReadinessCheck {
          healthReadinessCheck
        }
      `,
    });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.healthReadinessCheck).toEqual(expect.any(String));
  });

  it("should return the liveness check date", async context => {
    const response = await context.request.post("/graphql").send({
      query: gql`
        query HealthLivenessCheck {
          healthLivenessCheck
        }
      `,
    });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.healthLivenessCheck).toEqual(expect.any(String));
  });
});

import { describe, expect, it } from "vitest";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

describe("E2E: AdminProcessingTimeEstimationController", () => {
  it("should list the estimated execution times for an admin", async context => {
    const user = await userFactory.create({
      email: context.adminSession.email,
    });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    const response = await context
      .adminAuthorized(
        context.request.get("/admin/processing/estimated-execution-time"),
      )
      .query({ dataset_id: dataset.id })
      .send();

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should forbid a non admin user", async context => {
    const response = await context
      .userAuthorized(
        context.request.get("/admin/processing/estimated-execution-time"),
      )
      .send();

    expect(response.status).toBe(401);
  });
});

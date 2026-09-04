import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

describe("E2E: UserProcessingTimeEstimationController", () => {
  it("should show the estimated execution time", async context => {
    const user = await userFactory.create({
      email: context.userSession.email,
    });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(
        context.request.get("/processing/estimated-execution-time"),
      )
      .query({ dataset_id: dataset.id, processor_id: processor.id })
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      dataset_id: dataset.id,
      processor_id: processor.id,
    });
  });

  it("should show the estimated finish time", async context => {
    const user = await userFactory.create({
      email: context.userSession.email,
    });
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const finished_at = faker.date.recent();
    const processing = await processingFactory.create(
      {
        visibility: PROCESSING_VISIBILITY.PRIVATE,
        status: PROCESSING_STATUS.SUCCEEDED,
        started_at: faker.date.past({ refDate: finished_at }),
        finished_at,
      },
      { associations: { user, dataset, processor } },
    );

    const response = await context
      .userAuthorized(
        context.request.get(
          `/processing/${processing.id}/estimated-finish-time`,
        ),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      dataset_id: dataset.id,
      processor_id: processor.id,
      processing_id: processing.id,
    });
  });

  it("should return an error when unauthorized", async context => {
    const response = await context
      .userAuthorized(
        context.request.get("/processing/estimated-execution-time"),
      )
      .set("Authorization", `Bearer someToken`)
      .query({
        dataset_id: faker.string.uuid(),
        processor_id: faker.string.uuid(),
      })
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });
});

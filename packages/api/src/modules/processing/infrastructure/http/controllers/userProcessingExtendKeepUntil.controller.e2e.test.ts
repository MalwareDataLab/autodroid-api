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

describe("E2E: UserProcessingExtendKeepUntilController", () => {
  const seedProcessing = async (params: {
    email: string;
    owned?: boolean;
    visibility?: PROCESSING_VISIBILITY;
  }) => {
    const user = await userFactory.create({ email: params.email });
    const owner = params.owned === false ? await userFactory.create() : user;
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const processing = await processingFactory.create(
      {
        visibility: params.visibility ?? PROCESSING_VISIBILITY.PRIVATE,
        status: PROCESSING_STATUS.PENDING,
      },
      { associations: { user: owner, dataset, processor } },
    );

    return { processing };
  };

  it("should extend a processing keep until", async context => {
    const { processing } = await seedProcessing({
      email: context.userSession.email,
    });

    const response = await context
      .userAuthorized(
        context.request.patch(`/processing/${processing.id}/extend-keep-until`),
      )
      .send({ keep_until: faker.date.soon({ days: 10 }).toISOString() });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: processing.id });
  });

  it("should return an error extending the keep until of a processing owned by another user", async context => {
    const { processing } = await seedProcessing({
      email: context.userSession.email,
      owned: false,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(
        context.request.patch(`/processing/${processing.id}/extend-keep-until`),
      )
      .send({ keep_until: faker.date.soon({ days: 10 }).toISOString() });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@user_processing_extend_keep_until_service/CANNOT_EXTEND_PROCESSING_KEEP_UNTIL",
    });
  });

  it("should return an error when unauthorized", async context => {
    const response = await context
      .userAuthorized(
        context.request.patch(
          `/processing/${faker.string.uuid()}/extend-keep-until`,
        ),
      )
      .set("Authorization", `Bearer someToken`)
      .send({ keep_until: faker.date.soon({ days: 10 }).toISOString() });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });
});

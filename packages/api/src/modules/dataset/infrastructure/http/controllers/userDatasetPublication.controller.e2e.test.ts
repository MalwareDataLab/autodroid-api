import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

describe("E2E: UserDatasetPublicationController", () => {
  it("should request publication of a user dataset", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(
        context.request.post(`/dataset/${dataset.id}/request-publication`),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: dataset.id,
      visibility: DATASET_VISIBILITY.UNDER_REVIEW,
    });
  });

  it("should return an error requesting publication of a dataset that is not editable", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(
        context.request.post(`/dataset/${dataset.id}/request-publication`),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@user_dataset_request_publication_service/DATASET_NOT_EDITABLE",
    });
  });

  it("should return an error when unauthorized", async context => {
    const response = await context
      .userAuthorized(
        context.request.post(
          `/dataset/${faker.string.uuid()}/request-publication`,
        ),
      )
      .set("Authorization", `Bearer someToken`)
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });
});

import { describe, expect, it } from "vitest";

// Util import
import { gql } from "@/test/utils/gql.util";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

describe("E2E: FileFieldResolver", () => {
  it("should resolve the public_url field of a dataset file", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserDataset($dataset_id: String!) {
            userDataset(dataset_id: $dataset_id) {
              id
              file {
                id
                public_url
              }
            }
          }
        `,
        variables: { dataset_id: dataset.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDataset.file).toMatchObject({
      id: expect.any(String),
    });
    expect(response.body.data.userDataset.file.public_url).toBeNull();
  });
});

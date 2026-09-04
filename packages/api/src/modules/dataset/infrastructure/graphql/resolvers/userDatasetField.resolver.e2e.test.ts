import { gql } from "@/test/utils/gql.util";
import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

describe("E2E: UserDatasetFieldResolver", () => {
  it("should resolve the processes field of a dataset", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const processing = await processingFactory.create(
      { status: PROCESSING_STATUS.SUCCEEDED },
      { associations: { user, dataset, processor } },
    );

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserDataset($dataset_id: String!) {
            userDataset(dataset_id: $dataset_id) {
              id
              processes {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        `,
        variables: { dataset_id: dataset.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDataset.processes.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: processing.id }),
        }),
      ]),
    );
  });

  it("should return an error resolving processes when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: gql`
          query UserDataset($dataset_id: String!) {
            userDataset(dataset_id: $dataset_id) {
              id
              processes {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        `,
        variables: { dataset_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "UNAUTHORIZED" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });
});

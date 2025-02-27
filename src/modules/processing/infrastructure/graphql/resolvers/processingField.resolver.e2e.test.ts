import { gql } from "@/test/utils/gql.util";
import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

describe("E2E: ProcessingFieldResolver", () => {
  const seed = async (params: { email: string }) => {
    const user = await userFactory.create(params);
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    await Promise.all(
      Array.from({ length: 10 }).map(() => {
        const finished_at = faker.date.past();
        return processingFactory.create(
          {
            started_at: faker.date.past({ refDate: finished_at }),
            finished_at,
            status: PROCESSING_STATUS.SUCCEEDED,
          },
          {
            associations: {
              dataset,
              processor,
            },
          },
        );
      }),
    );

    return {
      user,
      dataset,
      processor,
    };
  };

  it("should be able to get the estimated processing time", async context => {
    const { dataset, processor } = await seed({
      email: context.userSession.email,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcesses {
            userProcesses {
              edges {
                node {
                  id
                  estimated_finish {
                    dataset_id
                    processor_id
                    estimated_start_time
                    estimated_finish_time
                  }
                }
              }
            }
          }
        `,
      });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcesses.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({
            estimated_finish: {
              dataset_id: dataset.id,
              processor_id: processor.id,
              estimated_start_time: expect.any(String),
              estimated_finish_time: expect.any(String),
            },
          }),
        }),
      ]),
    );
  });
});

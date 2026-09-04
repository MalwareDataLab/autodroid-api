import { gql } from "@/test/utils/gql.util";
import { describe, expect, it } from "vitest";

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

describe("E2E: UserProcessorFieldResolver", () => {
  it("should resolve the processes of a processor", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const processing = await processingFactory.create(
      {
        visibility: PROCESSING_VISIBILITY.PRIVATE,
        status: PROCESSING_STATUS.PENDING,
      },
      { associations: { user, dataset, processor } },
    );

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcessor($processor_id: String!) {
            userProcessor(processor_id: $processor_id) {
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
        variables: { processor_id: processor.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcessor.processes.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: processing.id }),
        }),
      ]),
    );
  });
});

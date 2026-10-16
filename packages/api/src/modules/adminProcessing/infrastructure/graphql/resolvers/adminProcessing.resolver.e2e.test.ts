import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

// Util import
import { gql } from "@/test/utils/gql.util";

// Enum import
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// Factory import
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

const futureDate = () =>
  new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

describe("E2E: AdminProcessingResolver", () => {
  it("should forbid listing processes for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminProcesses {
            adminProcesses {
              totalCount
            }
          }
        `,
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "FORBIDDEN" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should fail listing processes when unauthenticated", async context => {
    const response = await context.request.post("/graphql").send({
      query: gql`
        query AdminProcesses {
          adminProcesses {
            totalCount
          }
        }
      `,
    });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "FORBIDDEN" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should fail showing a processing that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminProcessing($processing_id: String!) {
            adminProcessing(processing_id: $processing_id) {
              id
            }
          }
        `,
        variables: { processing_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_processing_show_service/PROCESSING_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should fail updating a processing that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessingUpdate(
            $processing_id: String!
            $data: AdminProcessingUpdateSchema!
          ) {
            adminProcessingUpdate(processing_id: $processing_id, data: $data) {
              id
            }
          }
        `,
        variables: {
          processing_id: faker.string.uuid(),
          data: { keep_until: futureDate() },
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_processing_update_service/PROCESSING_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should fail deleting a processing that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessingDelete($processing_id: String!) {
            adminProcessingDelete(processing_id: $processing_id) {
              id
            }
          }
        `,
        variables: { processing_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_processing_delete_service/PROCESSING_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should clean expired processes for an admin", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessingCleanExpired {
            adminProcessingCleanExpired
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(typeof response.body.data.adminProcessingCleanExpired).toBe(
      "number",
    );
  });

  it("should fail dangling processes for an admin", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessingFailDangling {
            adminProcessingFailDangling
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(typeof response.body.data.adminProcessingFailDangling).toBe(
      "number",
    );
  });

  it("should list processing time estimations for an admin", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminProcessingTimeEstimation {
            adminProcessingTimeEstimation {
              dataset_id
              processor_id
              estimated_execution_time
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(
      Array.isArray(response.body.data.adminProcessingTimeEstimation),
    ).toBe(true);
  });

  it("should list processes for an admin", async context => {
    const processing = await processingFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminProcesses {
            adminProcesses {
              edges {
                node {
                  id
                }
              }
              totalCount
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminProcesses.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: processing.id }),
        }),
      ]),
    );
  });

  it("should show a processing for an admin", async context => {
    const processing = await processingFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminProcessing($processing_id: String!) {
            adminProcessing(processing_id: $processing_id) {
              id
            }
          }
        `,
        variables: { processing_id: processing.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminProcessing).toMatchObject({
      id: processing.id,
    });
  });

  it("should update a processing for an admin", async context => {
    const processing = await processingFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessingUpdate(
            $processing_id: String!
            $data: AdminProcessingUpdateSchema!
          ) {
            adminProcessingUpdate(processing_id: $processing_id, data: $data) {
              id
              visibility
            }
          }
        `,
        variables: {
          processing_id: processing.id,
          data: { visibility: "PUBLIC", keep_until: futureDate() },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminProcessingUpdate).toMatchObject({
      id: processing.id,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    });
  });

  it("should delete a processing that has no stored files for an admin", async context => {
    const processing = await processingFactory.create();
    await context.repositories.ProcessingRepository.updateOne(
      { id: processing.id },
      { result_file_id: null, metrics_file_id: null },
    );

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessingDelete($processing_id: String!) {
            adminProcessingDelete(processing_id: $processing_id) {
              id
            }
          }
        `,
        variables: { processing_id: processing.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminProcessingDelete).toMatchObject({
      id: processing.id,
    });
    await expect(
      context.repositories.ProcessingRepository.findOne({ id: processing.id }),
    ).resolves.toBeNull();
  });
});

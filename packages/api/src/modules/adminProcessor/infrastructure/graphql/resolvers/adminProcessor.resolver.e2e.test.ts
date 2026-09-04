import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { gql } from "@/test/utils/gql.util";

// Factory import
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

const makeProcessorInput = () => ({
  name: faker.system.fileName(),
  version: "1.0.0",
  image_tag: faker.string.alphanumeric(12),
  description: "A processor",
  tags: "one,two",
  allowed_mime_types: "image/png",
  visibility: "HIDDEN",
  configuration: {
    parameters: [
      {
        sequence: 1,
        name: "param",
        description: "A parameter",
        type: "STRING",
        is_required: false,
        default_value: null,
      },
    ],
    dataset_input_argument: "-i",
    dataset_input_value: "input",
    dataset_output_argument: "-o",
    dataset_output_value: "output",
    command: "run",
    output_result_file_glob_patterns: ["*"],
    output_metrics_file_glob_patterns: ["*"],
  },
});

describe("E2E: AdminProcessorResolver", () => {
  it("should list processors for an admin", async context => {
    const processor = await processorFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminProcessors {
            adminProcessors {
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
    expect(response.body.data.adminProcessors.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: processor.id }),
        }),
      ]),
    );
  });

  it("should forbid listing processors for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminProcessors {
            adminProcessors {
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

  it("should show a processor for an admin", async context => {
    const processor = await processorFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminProcessor($processor_id: String!) {
            adminProcessor(processor_id: $processor_id) {
              id
            }
          }
        `,
        variables: { processor_id: processor.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminProcessor).toMatchObject({
      id: processor.id,
    });
  });

  it("should fail showing a processor that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminProcessor($processor_id: String!) {
            adminProcessor(processor_id: $processor_id) {
              id
            }
          }
        `,
        variables: { processor_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_processor_show_service/PROCESSOR_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should create a processor for an admin", async context => {
    const data = makeProcessorInput();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessorCreate($data: ProcessorSchema!) {
            adminProcessorCreate(data: $data) {
              id
              name
              visibility
            }
          }
        `,
        variables: { data },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminProcessorCreate).toMatchObject({
      name: data.name,
      visibility: "HIDDEN",
    });
  });

  it("should fail creating a processor that already exists", async context => {
    const existing = await processorFactory.create();
    const data = { ...makeProcessorInput(), image_tag: existing.image_tag };

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessorCreate($data: ProcessorSchema!) {
            adminProcessorCreate(data: $data) {
              id
            }
          }
        `,
        variables: { data },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_processor_create_service/PROCESSOR_ALREADY_EXISTS",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should update a processor for an admin", async context => {
    const processor = await processorFactory.create();
    const data = { ...makeProcessorInput(), name: "Updated Processor" };

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessorUpdate(
            $processor_id: String!
            $data: ProcessorSchema!
          ) {
            adminProcessorUpdate(processor_id: $processor_id, data: $data) {
              id
              name
            }
          }
        `,
        variables: { processor_id: processor.id, data },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminProcessorUpdate).toMatchObject({
      id: processor.id,
      name: "Updated Processor",
    });
  });

  it("should fail updating a processor that was not found", async context => {
    const data = makeProcessorInput();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessorUpdate(
            $processor_id: String!
            $data: ProcessorSchema!
          ) {
            adminProcessorUpdate(processor_id: $processor_id, data: $data) {
              id
            }
          }
        `,
        variables: { processor_id: faker.string.uuid(), data },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_processor_update_service/PROCESSOR_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should delete a processor for an admin", async context => {
    const processor = await processorFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessorDelete($processor_id: String!) {
            adminProcessorDelete(processor_id: $processor_id) {
              id
            }
          }
        `,
        variables: { processor_id: processor.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminProcessorDelete).toMatchObject({
      id: processor.id,
    });
  });

  it("should fail deleting a processor that is in use", async context => {
    const processor = await processorFactory.create();
    await processingFactory.create({}, { associations: { processor } });

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessorDelete($processor_id: String!) {
            adminProcessorDelete(processor_id: $processor_id) {
              id
            }
          }
        `,
        variables: { processor_id: processor.id },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_processor_delete_service/PROCESSOR_IN_USE",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should fail deleting a processor that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminProcessorDelete($processor_id: String!) {
            adminProcessorDelete(processor_id: $processor_id) {
              id
            }
          }
        `,
        variables: { processor_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_processor_delete_service/PROCESSOR_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });
});

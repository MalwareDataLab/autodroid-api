import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

const makeProcessorBody = () => ({
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

describe("E2E: AdminProcessorController", () => {
  it("should list processors for an admin", async context => {
    const processor = await processorFactory.create();

    const response = await context
      .adminAuthorized(context.request.get("/admin/processor"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: processor.id }),
        }),
      ]),
    );
  });

  it("should fail listing processors for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.get("/admin/processor"))
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@admin_auth_middleware/NOT_AN_ADMIN",
    });
  });

  it("should fail listing processors when unauthenticated", async context => {
    const response = await context.request.get("/admin/processor").send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });

  it("should show a processor for an admin", async context => {
    const processor = await processorFactory.create();

    const response = await context
      .adminAuthorized(context.request.get(`/admin/processor/${processor.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: processor.id });
  });

  it("should fail showing a processor that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.get(`/admin/processor/${faker.string.uuid()}`),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_processor_show_service/PROCESSOR_NOT_FOUND",
    });
  });

  it("should create a processor for an admin", async context => {
    const body = makeProcessorBody();

    const response = await context
      .adminAuthorized(context.request.post("/admin/processor"))
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: body.name,
      visibility: "HIDDEN",
    });
  });

  it("should fail creating a processor that already exists", async context => {
    const existing = await processorFactory.create();
    const body = { ...makeProcessorBody(), image_tag: existing.image_tag };

    const response = await context
      .adminAuthorized(context.request.post("/admin/processor"))
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_processor_create_service/PROCESSOR_ALREADY_EXISTS",
    });
  });

  it("should update a processor for an admin", async context => {
    const processor = await processorFactory.create();
    const body = { ...makeProcessorBody(), name: "Updated Processor" };

    const response = await context
      .adminAuthorized(context.request.put(`/admin/processor/${processor.id}`))
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: processor.id,
      name: "Updated Processor",
    });
  });

  it("should fail updating a processor that was not found", async context => {
    const body = makeProcessorBody();

    const response = await context
      .adminAuthorized(
        context.request.put(`/admin/processor/${faker.string.uuid()}`),
      )
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_processor_update_service/PROCESSOR_NOT_FOUND",
    });
  });

  it("should delete a processor for an admin", async context => {
    const processor = await processorFactory.create();

    const response = await context
      .adminAuthorized(
        context.request.delete(`/admin/processor/${processor.id}`),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: processor.id });
  });

  it("should fail deleting a processor that is in use", async context => {
    const processor = await processorFactory.create();
    await processingFactory.create({}, { associations: { processor } });

    const response = await context
      .adminAuthorized(
        context.request.delete(`/admin/processor/${processor.id}`),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_processor_delete_service/PROCESSOR_IN_USE",
    });
  });

  it("should fail deleting a processor that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.delete(`/admin/processor/${faker.string.uuid()}`),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_processor_delete_service/PROCESSOR_NOT_FOUND",
    });
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import { createHash } from "node:crypto";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

const md5 = () =>
  createHash("md5").update(faker.string.alphanumeric(10)).digest("hex");

describe("E2E: UserDatasetController", () => {
  beforeEach(context => {
    context.container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => fileFactory.create(),
      refreshFile: async ({ file }) => file,
      removeFileByPath: async () => "",
    });
  });

  it("should list user datasets", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.get("/dataset"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: dataset.id }),
        }),
      ]),
    );
  });

  it("should show a user dataset", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.get(`/dataset/${dataset.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: dataset.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });
  });

  it("should return an error showing a dataset that was not found", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.get(`/dataset/${faker.string.uuid()}`))
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@dataset_guard/DATASET_NOT_FOUND",
    });
  });

  it("should create a user dataset", async context => {
    await userFactory.create({ email: context.userSession.email });
    await processorFactory.create({ allowed_mime_types: MIME_TYPE.PNG });

    const response = await context
      .userAuthorized(context.request.post("/dataset"))
      .send({
        filename: faker.system.fileName(),
        mime_type: MIME_TYPE.PNG,
        size: 1024,
        md5_hash: md5(),
        description: "A dataset",
        tags: "one,two,three",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      visibility: DATASET_VISIBILITY.PRIVATE,
      description: "A dataset",
      tags: "one,two,three",
    });
  });

  it("should return an error creating a dataset with a mime type not accepted by any processor", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.post("/dataset"))
      .send({
        filename: faker.system.fileName(),
        mime_type: MIME_TYPE.PNG,
        size: 1024,
        md5_hash: md5(),
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@user_dataset_create_service/MIME_TYPE_NOT_ACCEPTED_BY_ANY_PROCESSOR",
    });
  });

  it("should update a user dataset", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.put(`/dataset/${dataset.id}`))
      .send({ description: "Updated", tags: "a,b,c" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: dataset.id,
      description: "Updated",
      tags: "a,b,c",
    });
  });

  it("should return an error updating a dataset that is not editable", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(context.request.put(`/dataset/${dataset.id}`))
      .send({ description: "Updated" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@user_dataset_update_service/DATASET_NOT_EDITABLE",
    });
  });

  it("should delete a user dataset", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.delete(`/dataset/${dataset.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: dataset.id });
  });

  it("should return an error when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.get("/dataset"))
      .set("Authorization", `Bearer someToken`)
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });
});

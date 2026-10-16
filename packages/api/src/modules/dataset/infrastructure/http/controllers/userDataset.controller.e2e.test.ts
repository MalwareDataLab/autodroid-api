import { createHash } from "node:crypto";
import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

// Util import
import {
  generateStorageEmulatorPath,
  getStorageEmulatorObjectStatus,
  getStorageEmulatorSignedUrlTarget,
  putStorageEmulatorObject,
} from "@/test/utils/storageEmulator.util";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

const md5 = () =>
  createHash("md5").update(faker.string.alphanumeric(10)).digest("hex");

describe("E2E: UserDatasetController", () => {
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

  it("should return the owner only on the caller's own datasets when a user lists datasets", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const otherUser = await userFactory.create();
    const ownDataset = await datasetFactory.create(
      { visibility: DATASET_VISIBILITY.PRIVATE },
      { associations: { user } },
    );
    const otherUserPublicDataset = await datasetFactory.create(
      { visibility: DATASET_VISIBILITY.PUBLIC },
      { associations: { user: otherUser } },
    );

    const response = await context
      .userAuthorized(context.request.get("/dataset"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toHaveLength(2);
    expect(response.body.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({
            id: ownDataset.id,
            user_id: user.id,
            user: expect.objectContaining({
              id: user.id,
              email: user.email,
              phone_number: user.phone_number,
            }),
          }),
        }),
        expect.objectContaining({
          node: expect.objectContaining({
            id: otherUserPublicDataset.id,
            user_id: otherUser.id,
            user: null,
          }),
        }),
      ]),
    );
    expect(JSON.stringify(response.body)).not.toContain(otherUser.email);
  });

  it("should return only the requested page, in the requested order, when a user lists datasets", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const datasetsOldestFirst = await Promise.all(
      Array.from({ length: 11 }, (_, index) =>
        datasetFactory.create(
          { created_at: new Date(Date.UTC(2024, 0, index + 1)) },
          { associations: { user } },
        ),
      ),
    );

    const response = await context
      .userAuthorized(
        context.request.get("/dataset").query({
          skip: 1,
          take: 1,
          sort: JSON.stringify([{ field: "created_at", order: "asc" }]),
        }),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body.totalCount).toBe(11);
    expect(response.body.edges).toHaveLength(1);
    expect(response.body.edges[0].node.id).toBe(datasetsOldestFirst[1].id);
    expect(response.body.pageInfo).toMatchObject({
      hasPreviousPage: true,
      hasNextPage: true,
    });
  });

  it("should not return the owner when a user shows another user's public dataset", async context => {
    await userFactory.create({ email: context.userSession.email });
    const otherUser = await userFactory.create();
    const otherUserPublicDataset = await datasetFactory.create(
      { visibility: DATASET_VISIBILITY.PUBLIC },
      { associations: { user: otherUser } },
    );

    const response = await context
      .userAuthorized(
        context.request.get(`/dataset/${otherUserPublicDataset.id}`),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: otherUserPublicDataset.id,
      user_id: otherUser.id,
      user: null,
    });
    expect(JSON.stringify(response.body)).not.toContain(otherUser.email);
  });

  it("should return the full owner when an admin shows another user's public dataset", async context => {
    await userFactory.create({ email: context.adminSession.email });
    const otherUser = await userFactory.create();
    const otherUserPublicDataset = await datasetFactory.create(
      { visibility: DATASET_VISIBILITY.PUBLIC },
      { associations: { user: otherUser } },
    );

    const response = await context
      .adminAuthorized(
        context.request.get(`/dataset/${otherUserPublicDataset.id}`),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: otherUserPublicDataset.id,
      user_id: otherUser.id,
      user: {
        id: otherUser.id,
        email: otherUser.email,
        phone_number: otherUser.phone_number,
      },
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

  it("should create a user dataset with a signed upload url from the storage provider", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    await processorFactory.create({ allowed_mime_types: MIME_TYPE.PNG });
    const md5Hash = md5();

    const response = await context
      .userAuthorized(context.request.post("/dataset"))
      .send({
        filename: `${faker.string.alphanumeric(12)}.png`,
        mime_type: MIME_TYPE.PNG,
        size: 1024,
        md5_hash: md5Hash,
        description: " A dataset ",
        tags: "one, two,three",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      visibility: DATASET_VISIBILITY.PRIVATE,
      description: "A dataset",
      tags: "one,two,three",
    });
    const createdDataset = await context.repositories.DatasetRepository.findOne(
      { id: response.body.id },
    );
    expect(createdDataset).toMatchObject({
      user_id: user.id,
      file: {
        provider_path: expect.stringMatching(/^test\/datasets\/.+\.png$/),
        provider_status: FILE_PROVIDER_STATUS.PENDING,
        type: FILE_TYPE.DATASET,
        mime_type: MIME_TYPE.PNG,
        size: 1024,
        md5_hash: Buffer.from(md5Hash, "hex").toString("base64"),
      },
    });
    const uploadUrl = new URL(createdDataset!.file.upload_url!);
    expect(`${uploadUrl.origin}${uploadUrl.pathname}`).toBe(
      getStorageEmulatorSignedUrlTarget(createdDataset!.file.provider_path),
    );
    expect(uploadUrl.searchParams.get("X-Goog-Algorithm")).toBe(
      "GOOG4-RSA-SHA256",
    );
  });

  it("should delete a user dataset and its stored object", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const file = await fileFactory.create({
      provider_path: generateStorageEmulatorPath("datasets"),
    });
    await putStorageEmulatorObject(file.provider_path);
    const dataset = await datasetFactory.create({
      user_id: user.id,
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(context.request.delete(`/dataset/${dataset.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: dataset.id });
    await expect(
      context.repositories.DatasetRepository.findOne({ id: dataset.id }),
    ).resolves.toBeNull();
    await expect(
      getStorageEmulatorObjectStatus(file.provider_path),
    ).resolves.toBe(404);
  });
});

import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

// Util import
import { createAuthorizedWorker } from "@/test/utils/workerAuth.util";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

const readyPublicFile = () =>
  fileFactory.create({
    provider_status: FILE_PROVIDER_STATUS.READY,
    allow_public_access: true,
    upload_url: null,
    upload_url_expires_at: null,
    public_url: "https://example.com/output.zip",
    public_url_expires_at: faker.date.future(),
  });

const seedOwnedProcessing = async (
  overrides: Parameters<typeof processingFactory.create>[0],
) => {
  const owner = await userFactory.create();
  const datasetOwner = await userFactory.create();
  const dataset = await datasetFactory.create(
    {},
    { associations: { user: datasetOwner } },
  );

  return processingFactory.create(overrides, {
    associations: { user: owner, dataset },
  });
};

describe("E2E: WorkerProcessingController", () => {
  it("should show a processing to the worker without exposing any owner", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const processing = await seedOwnedProcessing({
      status: PROCESSING_STATUS.PENDING,
    });

    const response = await context.request
      .get(`/worker/processing/${processing.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: processing.id,
      user_id: processing.user_id,
      user: null,
      dataset: { id: processing.dataset_id, user: null },
    });
  });

  it("should register progress without exposing any owner", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const processing = await seedOwnedProcessing({
      status: PROCESSING_STATUS.PENDING,
    });

    const response = await context.request
      .post(`/worker/processing/${processing.id}/progress`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: processing.id,
      user: null,
      dataset: { id: processing.dataset_id, user: null },
    });
  });

  it("should register success without exposing any owner", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const resultFile = await readyPublicFile();
    const metricsFile = await readyPublicFile();
    const processing = await seedOwnedProcessing({
      status: PROCESSING_STATUS.RUNNING,
      result_file_id: resultFile.id,
      metrics_file_id: metricsFile.id,
    });

    const response = await context.request
      .post(`/worker/processing/${processing.id}/success`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: processing.id,
      status: PROCESSING_STATUS.SUCCEEDED,
      user: null,
      dataset: { id: processing.dataset_id, user: null },
    });
  });

  it("should register failure without exposing any owner", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const processing = await seedOwnedProcessing({
      status: PROCESSING_STATUS.RUNNING,
    });

    const response = await context.request
      .post(`/worker/processing/${processing.id}/failure`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ reason: "Something went wrong" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: processing.id,
      status: PROCESSING_STATUS.FAILED,
      user: null,
      dataset: { id: processing.dataset_id, user: null },
    });
  });

  it("should fail showing a processing that was not found", async context => {
    const { accessToken } = await createAuthorizedWorker();

    const response = await context.request
      .get(`/worker/processing/${faker.string.uuid()}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@worker_processing_show_service/PROCESSING_NOT_FOUND",
    });
  });

  it("should fail when unauthenticated", async context => {
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.PENDING,
    });

    const response = await context.request
      .get(`/worker/processing/${processing.id}`)
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@worker_auth_middleware/NOT_AUTHENTICATED",
    });
  });

  it.for([
    "progress",
    "success",
    "failure",
    "result_file/generate_upload",
    "result_file/uploaded",
    "metrics_file/generate_upload",
    "metrics_file/uploaded",
  ])(
    "should reject POST /worker/processing/:id/%s with an invalid token",
    async (path, context) => {
      const response = await context.request
        .post(`/worker/processing/${faker.string.uuid()}/${path}`)
        .set("Authorization", `Bearer invalid.worker.token`)
        .send({});

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        code: "@worker_auth_middleware/NOT_AUTHENTICATED",
      });
    },
  );

  it("should show a processing to the worker", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.PENDING,
      visibility: PROCESSING_VISIBILITY.PRIVATE,
    });

    const response = await context.request
      .get(`/worker/processing/${processing.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: processing.id });
  });

  it("should register processing progress", async context => {
    const { accessToken, worker } = await createAuthorizedWorker();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.PENDING,
    });

    const response = await context.request
      .post(`/worker/processing/${processing.id}/progress`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: processing.id,
      status: PROCESSING_STATUS.RUNNING,
      worker_id: worker.id,
    });
  });

  it("should register processing success", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const resultFile = await readyPublicFile();
    const metricsFile = await readyPublicFile();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      result_file_id: resultFile.id,
      metrics_file_id: metricsFile.id,
    });

    const response = await context.request
      .post(`/worker/processing/${processing.id}/success`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: processing.id,
      status: PROCESSING_STATUS.SUCCEEDED,
    });
  });

  it("should fail registering success without output files", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
    });
    await context.repositories.ProcessingRepository.updateOne(
      { id: processing.id },
      { result_file_id: null, metrics_file_id: null },
    );

    const response = await context.request
      .post(`/worker/processing/${processing.id}/success`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@worker_handle_processing_success_service/NO_OUTPUT_FILES_FOUND",
    });
  });

  it("should register processing failure", async context => {
    const { accessToken, worker } = await createAuthorizedWorker();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
    });

    const response = await context.request
      .post(`/worker/processing/${processing.id}/failure`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ reason: "Something went wrong" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: processing.id,
      status: PROCESSING_STATUS.FAILED,
      worker_id: worker.id,
      message: "Something went wrong",
    });
  });

  it("should fail registering failure when processing already succeeded", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const resultFile = await readyPublicFile();
    const metricsFile = await readyPublicFile();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.SUCCEEDED,
      result_file_id: resultFile.id,
      metrics_file_id: metricsFile.id,
    });

    const response = await context.request
      .post(`/worker/processing/${processing.id}/failure`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@worker_handle_processing_failure_service/PROCESSING_ALREADY_SUCCEEDED",
    });
  });
});

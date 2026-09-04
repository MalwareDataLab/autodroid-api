import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import { createHash } from "node:crypto";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Util import
import { createAuthorizedWorker } from "@/test/utils/workerAuth.util";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

const md5 = () =>
  createHash("md5").update(faker.string.alphanumeric(10)).digest("hex");

describe("E2E: WorkerProcessingResultFileController", () => {
  beforeEach(context => {
    context.container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => fileFactory.create(),
      refreshFile: async ({ file }) => file,
      removeFileByPath: async () => "",
    });
  });

  it("should generate a result file upload url", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
    });

    const response = await context.request
      .post(`/worker/processing/${processing.id}/result_file/generate_upload`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        filename: faker.system.fileName(),
        mime_type: MIME_TYPE.CSV,
        size: 1024,
        md5_hash: md5(),
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBeTruthy();
  });

  it("should fail generating a result upload for a processing not found", async context => {
    const { accessToken } = await createAuthorizedWorker();

    const response = await context.request
      .post(
        `/worker/processing/${faker.string.uuid()}/result_file/generate_upload`,
      )
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        filename: faker.system.fileName(),
        mime_type: MIME_TYPE.CSV,
        size: 1024,
        md5_hash: md5(),
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@worker_generate_processing_result_upload_file_service/PROCESSING_NOT_FOUND",
    });
  });

  it("should capture an uploaded result file", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const resultFile = await fileFactory.create({
      provider_status: FILE_PROVIDER_STATUS.READY,
      allow_public_access: true,
      upload_url: null,
      upload_url_expires_at: null,
      public_url: "https://example.com/result.csv",
      public_url_expires_at: faker.date.future(),
    });
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      result_file_id: resultFile.id,
    });

    const response = await context.request
      .post(`/worker/processing/${processing.id}/result_file/uploaded`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: resultFile.id });
  });

  it("should fail capturing a result file when not present", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
    });
    await context.repositories.ProcessingRepository.updateOne(
      { id: processing.id },
      { result_file_id: null },
    );

    const response = await context.request
      .post(`/worker/processing/${processing.id}/result_file/uploaded`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@worker_handle_processing_result_upload_file_service/RESULT_FILE_NOT_FOUND",
    });
  });
});

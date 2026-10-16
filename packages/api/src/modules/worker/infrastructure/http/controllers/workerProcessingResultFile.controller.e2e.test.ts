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
import { createAuthorizedWorker } from "@/test/utils/workerAuth.util";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

const md5 = () =>
  createHash("md5").update(faker.string.alphanumeric(10)).digest("hex");

describe("E2E: WorkerProcessingResultFileController", () => {
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

  it("should generate a result file upload url and replace the previous stored result", async context => {
    const { worker, accessToken } = await createAuthorizedWorker();
    const previousFile = await fileFactory.create({
      provider_path: generateStorageEmulatorPath("processing_results"),
    });
    await putStorageEmulatorObject(previousFile.provider_path);
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      result_file_id: previousFile.id,
    });
    const md5Hash = md5();

    const response = await context.request
      .post(`/worker/processing/${processing.id}/result_file/generate_upload`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        filename: `${faker.string.alphanumeric(12)}.csv`,
        mime_type: MIME_TYPE.CSV,
        size: 1024,
        md5_hash: md5Hash,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: expect.any(String),
      provider_status: FILE_PROVIDER_STATUS.PENDING,
    });
    const generatedFile = response.body;
    const updatedProcessing =
      await context.repositories.ProcessingRepository.findOne({
        id: processing.id,
      });
    expect(updatedProcessing).toMatchObject({
      worker_id: worker.id,
      status: PROCESSING_STATUS.RUNNING,
      finished_at: null,
      result_file_id: generatedFile.id,
    });
    const storedFile = await context.repositories.FileRepository.findOne({
      id: generatedFile.id,
    });
    expect(storedFile).toMatchObject({
      provider_path: expect.stringMatching(
        /^test\/processing_results\/.+\.csv$/,
      ),
      provider_status: FILE_PROVIDER_STATUS.PENDING,
      type: FILE_TYPE.PROCESSING_RESULT,
      mime_type: MIME_TYPE.CSV,
      size: 1024,
      md5_hash: Buffer.from(md5Hash, "hex").toString("base64"),
      allow_public_access: true,
    });
    const uploadUrl = new URL(storedFile!.upload_url!);
    expect(`${uploadUrl.origin}${uploadUrl.pathname}`).toBe(
      getStorageEmulatorSignedUrlTarget(storedFile!.provider_path),
    );
    expect(uploadUrl.searchParams.get("X-Goog-Algorithm")).toBe(
      "GOOG4-RSA-SHA256",
    );
    await expect(
      getStorageEmulatorObjectStatus(previousFile.provider_path),
    ).resolves.toBe(404);
  });
});

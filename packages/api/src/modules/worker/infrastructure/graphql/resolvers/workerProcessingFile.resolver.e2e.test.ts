import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import { createHash } from "node:crypto";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Util import
import { gql } from "@/test/utils/gql.util";
import { createAuthorizedWorker } from "@/test/utils/workerAuth.util";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

const md5 = () =>
  createHash("md5").update(faker.string.alphanumeric(10)).digest("hex");

const uploadData = () => ({
  filename: faker.system.fileName(),
  mime_type: "CSV",
  size: 1024,
  md5_hash: md5(),
});

const readyUploadedFile = () =>
  fileFactory.create({
    provider_status: FILE_PROVIDER_STATUS.READY,
    allow_public_access: true,
    upload_url: null,
    upload_url_expires_at: null,
    public_url: "https://example.com/result.csv",
    public_url_expires_at: faker.date.future(),
  });

const GENERATE_RESULT_UPLOAD_MUTATION = gql`
  mutation WorkerProcessingGenerateResultFileUpload(
    $data: RequestFileUploadSignedUrlSchema!
    $processing_id: String!
  ) {
    workerProcessingGenerateResultFileUpload(
      data: $data
      processing_id: $processing_id
    ) {
      id
    }
  }
`;

const CAPTURE_RESULT_UPLOAD_MUTATION = gql`
  mutation WorkerProcessingCaptureResultFileUpload($processing_id: String!) {
    workerProcessingCaptureResultFileUpload(processing_id: $processing_id) {
      id
    }
  }
`;

const GENERATE_METRICS_UPLOAD_MUTATION = gql`
  mutation WorkerProcessingGenerateMetricsFileUpload(
    $data: RequestFileUploadSignedUrlSchema!
    $processing_id: String!
  ) {
    workerProcessingGenerateMetricsFileUpload(
      data: $data
      processing_id: $processing_id
    ) {
      id
    }
  }
`;

const CAPTURE_METRICS_UPLOAD_MUTATION = gql`
  mutation WorkerProcessingCaptureMetricsFileUpload($processing_id: String!) {
    workerProcessingCaptureMetricsFileUpload(processing_id: $processing_id) {
      id
    }
  }
`;

describe("E2E: WorkerProcessingFileResolver", () => {
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
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: GENERATE_RESULT_UPLOAD_MUTATION,
        variables: { data: uploadData(), processing_id: processing.id },
      });

    expect(response.body.errors).toBeUndefined();
    expect(
      response.body.data.workerProcessingGenerateResultFileUpload.id,
    ).toBeTruthy();
  });

  it("should fail generating a result upload for a processing not found", async context => {
    const { accessToken } = await createAuthorizedWorker();

    const response = await context.request
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: GENERATE_RESULT_UPLOAD_MUTATION,
        variables: {
          data: uploadData(),
          processing_id: faker.string.uuid(),
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@worker_generate_processing_result_upload_file_service/PROCESSING_NOT_FOUND",
          },
        }),
      ]),
    );
  });

  it("should capture an uploaded result file", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const resultFile = await readyUploadedFile();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      result_file_id: resultFile.id,
    });

    const response = await context.request
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: CAPTURE_RESULT_UPLOAD_MUTATION,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.workerProcessingCaptureResultFileUpload).toEqual(
      expect.objectContaining({ id: resultFile.id }),
    );
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
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: CAPTURE_RESULT_UPLOAD_MUTATION,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@worker_handle_processing_result_upload_file_service/RESULT_FILE_NOT_FOUND",
          },
        }),
      ]),
    );
  });

  it("should generate a metrics file upload url", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
    });

    const response = await context.request
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: GENERATE_METRICS_UPLOAD_MUTATION,
        variables: { data: uploadData(), processing_id: processing.id },
      });

    expect(response.body.errors).toBeUndefined();
    expect(
      response.body.data.workerProcessingGenerateMetricsFileUpload.id,
    ).toBeTruthy();
  });

  it("should capture an uploaded metrics file", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const metricsFile = await readyUploadedFile();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      metrics_file_id: metricsFile.id,
    });

    const response = await context.request
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: CAPTURE_METRICS_UPLOAD_MUTATION,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.workerProcessingCaptureMetricsFileUpload).toEqual(
      expect.objectContaining({ id: metricsFile.id }),
    );
  });

  it("should fail capturing a metrics file when not present", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
    });
    await context.repositories.ProcessingRepository.updateOne(
      { id: processing.id },
      { metrics_file_id: null },
    );

    const response = await context.request
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: CAPTURE_METRICS_UPLOAD_MUTATION,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@worker_handle_processing_metrics_upload_file_service/METRICS_FILE_NOT_FOUND",
          },
        }),
      ]),
    );
  });

  it("should forbid a worker file mutation for a user access token", async context => {
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: CAPTURE_RESULT_UPLOAD_MUTATION,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "FORBIDDEN" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });
});

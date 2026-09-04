import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Util import
import { gql } from "@/test/utils/gql.util";
import { createAuthorizedWorker } from "@/test/utils/workerAuth.util";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

const WORKER_PROCESSING_QUERY = gql`
  query WorkerProcessing($processing_id: String!) {
    workerProcessing(processing_id: $processing_id) {
      id
      status
    }
  }
`;

const REGISTER_PROGRESS_MUTATION = gql`
  mutation WorkerProcessingRegisterProgress($processing_id: String!) {
    workerProcessingRegisterProgress(processing_id: $processing_id) {
      id
      status
      worker_id
    }
  }
`;

const REGISTER_SUCCESS_MUTATION = gql`
  mutation WorkerProcessingRegisterSuccess($processing_id: String!) {
    workerProcessingRegisterSuccess(processing_id: $processing_id) {
      id
      status
    }
  }
`;

const REGISTER_FAILURE_MUTATION = gql`
  mutation WorkerProcessingRegisterFailure($processing_id: String!) {
    workerProcessingRegisterFailure(processing_id: $processing_id) {
      id
      status
      worker_id
    }
  }
`;

const readyPublicFile = () =>
  fileFactory.create({
    provider_status: FILE_PROVIDER_STATUS.READY,
    allow_public_access: true,
    upload_url: null,
    upload_url_expires_at: null,
    public_url: "https://example.com/output.zip",
    public_url_expires_at: faker.date.future(),
  });

describe("E2E: WorkerProcessingResolver", () => {
  beforeEach(context => {
    context.container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => fileFactory.create(),
      refreshFile: async ({ file }) => file,
      removeFileByPath: async () => "",
    });

    context.container.registerInstance<IJobProvider>("JobProvider", {
      initialization: Promise.resolve(),
      add: () => undefined,
      close: async () => undefined,
    });
  });

  it("should show a processing to the worker", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.PENDING,
      visibility: PROCESSING_VISIBILITY.PRIVATE,
    });

    const response = await context.request
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: WORKER_PROCESSING_QUERY,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.workerProcessing).toEqual(
      expect.objectContaining({ id: processing.id }),
    );
  });

  it("should fail showing a processing that was not found", async context => {
    const { accessToken } = await createAuthorizedWorker();

    const response = await context.request
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: WORKER_PROCESSING_QUERY,
        variables: { processing_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@worker_processing_show_service/PROCESSING_NOT_FOUND",
          },
        }),
      ]),
    );
  });

  it("should register processing progress", async context => {
    const { accessToken, worker } = await createAuthorizedWorker();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.PENDING,
    });

    const response = await context.request
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: REGISTER_PROGRESS_MUTATION,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.workerProcessingRegisterProgress).toEqual(
      expect.objectContaining({
        id: processing.id,
        status: PROCESSING_STATUS.RUNNING,
        worker_id: worker.id,
      }),
    );
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
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: REGISTER_SUCCESS_MUTATION,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.workerProcessingRegisterSuccess).toEqual(
      expect.objectContaining({
        id: processing.id,
        status: PROCESSING_STATUS.SUCCEEDED,
      }),
    );
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
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: REGISTER_SUCCESS_MUTATION,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@worker_handle_processing_success_service/NO_OUTPUT_FILES_FOUND",
          },
        }),
      ]),
    );
  });

  it("should register processing failure", async context => {
    const { accessToken, worker } = await createAuthorizedWorker();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
    });

    const response = await context.request
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: REGISTER_FAILURE_MUTATION,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.workerProcessingRegisterFailure).toEqual(
      expect.objectContaining({
        id: processing.id,
        status: PROCESSING_STATUS.FAILED,
        worker_id: worker.id,
      }),
    );
  });

  it("should fail registering failure when the processing already succeeded", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const resultFile = await readyPublicFile();
    const metricsFile = await readyPublicFile();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.SUCCEEDED,
      result_file_id: resultFile.id,
      metrics_file_id: metricsFile.id,
    });

    const response = await context.request
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: REGISTER_FAILURE_MUTATION,
        variables: { processing_id: processing.id },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@worker_handle_processing_failure_service/PROCESSING_ALREADY_SUCCEEDED",
          },
        }),
      ]),
    );
  });

  it("should forbid the workerProcessing query for a user access token", async context => {
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.PENDING,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: WORKER_PROCESSING_QUERY,
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

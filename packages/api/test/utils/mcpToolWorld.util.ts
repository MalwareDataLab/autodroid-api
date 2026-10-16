import { TestContext, vi } from "vitest";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";
import { PROCESSOR_PARAMETER_TYPE } from "@modules/processor/types/processorParameterType.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { mcpAuthorizationGrantFactory } from "@modules/mcpAuthorization/entities/factories/mcpAuthorizationGrant.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

const SEEDED_AT = new Date("2026-03-01T10:00:00.000Z");
const UPLOAD_URL = "https://storage.example.test/upload/created.csv";
const UPLOAD_URL_EXPIRES_AT = new Date("2029-06-01T00:00:00.000Z");
const DOWNLOAD_URL_EXPIRES_AT = new Date("2030-01-01T00:00:00.000Z");
const KEEP_UNTIL = new Date("2030-01-01T00:00:00.000Z");

const createCreatedAtSequence = () => {
  let minutes = 0;
  return () => {
    minutes += 1;
    return new Date(SEEDED_AT.getTime() + minutes * 60_000);
  };
};

const signIn = async (
  context: TestContext,
  authorized: TestContext["userAuthorized"],
  email: string,
  isAdmin: boolean,
) => {
  const response = await authorized(context.request.post("/graphql")).send({
    query: "query { user { id } }",
  });
  const userAuthProviderConn =
    await context.repositories.UserAuthProviderConnRepository.findOne({
      user_id: response.body.data.user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });

  return {
    email,
    session: parse(Session, {
      user: userAuthProviderConn!.user,
      user_auth_provider_conn: userAuthProviderConn,
      user_session: {
        access_token: "never-shown-access-token",
        access_token_expires_at: new Date("2031-01-01T01:00:00.000Z"),
        refresh_token: null,
        refresh_token_expires_at: null,
        payload: {},
        user_auth_provider_conn_id: userAuthProviderConn!.id,
        user_auth_provider_conn: userAuthProviderConn,
      },
      is_admin: isAdmin,
    }),
  };
};

const seedMcpToolWorld = async (context: TestContext) => {
  const nextCreatedAt = createCreatedAtSequence();

  context.container.registerInstance<IStorageProvider>("StorageProvider", {
    provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
    initialization: Promise.resolve(),
    generateUploadSignedUrl: async params =>
      fileFactory.create({
        filename: params.filename,
        mime_type: params.mimeType,
        type: params.fileType,
        size: params.size,
        md5_hash: params.md5Hash,
        upload_url: UPLOAD_URL,
        upload_url_expires_at: UPLOAD_URL_EXPIRES_AT,
      }),
    refreshFile: async ({ file }) => ({
      ...file,
      public_url: `https://storage.example.test/download/${file.id}`,
      public_url_expires_at: DOWNLOAD_URL_EXPIRES_AT,
    }),
    removeFileByPath: async () => "",
  });
  if (context.authenticationMethod)
    vi.mocked(context.authenticationMethod.updateUserByCode).mockImplementation(
      async (code, data) => ({
        code,
        email: context.userSession.email,
        name: data.name,
        auth_provider: AUTH_PROVIDER.FIREBASE,
      }),
    );

  const owner = await signIn(
    context,
    context.userAuthorized,
    context.userSession.email,
    false,
  );
  const admin = await signIn(
    context,
    context.adminAuthorized,
    context.adminSession.email,
    true,
  );
  const otherUser = await userFactory.create({
    name: "Other Person",
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });

  const createDatasetFile = (overrides: Record<string, unknown> = {}) =>
    fileFactory.create({
      type: FILE_TYPE.DATASET,
      mime_type: MIME_TYPE.CSV,
      size: 2048,
      created_at: nextCreatedAt(),
      updated_at: SEEDED_AT,
      ...overrides,
    });

  const ownDatasetFile = await createDatasetFile({ filename: "own.csv" });
  const publicDatasetFile = await createDatasetFile({
    filename: "public.csv",
  });
  const otherPrivateDatasetFile = await createDatasetFile({
    filename: "other-private.csv",
  });
  const danglingFile = await createDatasetFile({ filename: "dangling.csv" });
  const resultFile = await fileFactory.create({
    type: FILE_TYPE.PROCESSING_RESULT,
    mime_type: MIME_TYPE.ZIP,
    filename: "result.zip",
    size: 4096,
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });
  const metricsFile = await fileFactory.create({
    type: FILE_TYPE.PROCESSING_METRICS,
    mime_type: MIME_TYPE.CSV,
    filename: "metrics.csv",
    size: 512,
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });

  const ownDataset = await datasetFactory.create({
    user_id: owner.session.user.id,
    file_id: ownDatasetFile.id,
    description: "Own dataset",
    tags: "own,seed",
    visibility: DATASET_VISIBILITY.PRIVATE,
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });
  const publicDataset = await datasetFactory.create({
    user_id: otherUser.id,
    file_id: publicDatasetFile.id,
    description: "Public dataset",
    tags: "public",
    visibility: DATASET_VISIBILITY.PUBLIC,
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });
  const otherPrivateDataset = await datasetFactory.create({
    user_id: otherUser.id,
    file_id: otherPrivateDatasetFile.id,
    description: "Other person's private dataset",
    tags: "private",
    visibility: DATASET_VISIBILITY.PRIVATE,
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });

  const processor = await processorFactory.create({
    user_id: admin.session.user.id,
    name: "Public processor",
    version: "1.0.0",
    image_tag: "registry.example.test/processor:1.0.0",
    description: "Synthesizes data",
    tags: "synth",
    allowed_mime_types: "text/csv",
    visibility: PROCESSOR_VISIBILITY.PUBLIC,
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
    configuration: {
      command: "python run.py",
      dataset_input_argument: "--input",
      dataset_input_value: "/data/input.csv",
      dataset_output_argument: "--output",
      dataset_output_value: "/data/output",
      output_metrics_file_glob_patterns: ["metrics*.csv"],
      output_result_file_glob_patterns: ["result*.zip"],
      parameters: [
        {
          sequence: 1,
          name: "epochs",
          description: "How many epochs",
          type: PROCESSOR_PARAMETER_TYPE.INTEGER,
          is_required: false,
          default_value: "10",
        },
      ],
    },
  });
  const hiddenProcessor = await processorFactory.create({
    user_id: admin.session.user.id,
    name: "Hidden processor",
    version: "0.1.0",
    image_tag: "registry.example.test/hidden:0.1.0",
    description: "Hidden from the public",
    visibility: PROCESSOR_VISIBILITY.HIDDEN,
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });

  const finishedProcessing = await processingFactory.create({
    user_id: owner.session.user.id,
    dataset_id: ownDataset.id,
    processor_id: processor.id,
    result_file_id: resultFile.id,
    metrics_file_id: metricsFile.id,
    status: PROCESSING_STATUS.SUCCEEDED,
    visibility: PROCESSING_VISIBILITY.PRIVATE,
    started_at: SEEDED_AT,
    finished_at: new Date("2026-03-01T11:00:00.000Z"),
    keep_until: KEEP_UNTIL,
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });
  const pendingProcessing = await processingFactory.create({
    user_id: owner.session.user.id,
    dataset_id: ownDataset.id,
    processor_id: processor.id,
    status: PROCESSING_STATUS.PENDING,
    visibility: PROCESSING_VISIBILITY.PRIVATE,
    keep_until: KEEP_UNTIL,
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });
  const publicProcessing = await processingFactory.create({
    user_id: otherUser.id,
    dataset_id: publicDataset.id,
    processor_id: processor.id,
    status: PROCESSING_STATUS.FAILED,
    visibility: PROCESSING_VISIBILITY.PUBLIC,
    keep_until: KEEP_UNTIL,
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });

  const usedRegistrationToken = await workerRegistrationTokenFactory.create({
    user_id: admin.session.user.id,
    token: "used-registration-token",
    is_unlimited_usage: true,
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });
  const freeRegistrationToken = await workerRegistrationTokenFactory.create({
    user_id: admin.session.user.id,
    token: "free-registration-token",
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });
  const worker = await workerFactory.create({
    user_id: admin.session.user.id,
    registration_token_id: usedRegistrationToken.id,
    name: "worker-one",
    version: "1.2.3",
    description: "A worker",
    tags: "gpu",
    last_seen_at: SEEDED_AT,
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });

  const grant = await mcpAuthorizationGrantFactory.create({
    user_id: owner.session.user.id,
    client_id: "mcpc1.seededClient",
    client_name: "First agent",
    expires_at: new Date("2099-01-01T00:00:00.000Z"),
    created_at: nextCreatedAt(),
    updated_at: SEEDED_AT,
  });

  const entities = {
    ownDataset,
    publicDataset,
    otherPrivateDataset,
    ownDatasetFile,
    publicDatasetFile,
    otherPrivateDatasetFile,
    danglingFile,
    resultFile,
    metricsFile,
    processor,
    hiddenProcessor,
    finishedProcessing,
    pendingProcessing,
    publicProcessing,
    usedRegistrationToken,
    freeRegistrationToken,
    worker,
    grant,
    otherUser,
    ownerUser: owner.session.user,
    adminUser: admin.session.user,
    ownerConnection: owner.session.user_auth_provider_conn,
    adminConnection: admin.session.user_auth_provider_conn,
  };

  return {
    ...entities,
    ownerSession: owner.session,
    adminSession: admin.session,
    idLabels: new Map<string, string>(
      Object.entries(entities).map(([label, entity]) => [entity.id, label]),
    ),
  };
};

type IMcpToolWorld = Awaited<ReturnType<typeof seedMcpToolWorld>>;

export { seedMcpToolWorld };
export type { IMcpToolWorld };

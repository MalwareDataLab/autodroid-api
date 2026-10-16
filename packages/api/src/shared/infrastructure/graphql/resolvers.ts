import { BuildSchemaOptions } from "type-graphql";

// Resolver import
import { AdminDatasetResolver } from "@modules/adminDataset/infrastructure/graphql/resolvers/adminDataset.resolver";
import { AdminFileResolver } from "@modules/adminFile/infrastructure/graphql/resolvers/adminFile.resolver";
import { AdminProcessingResolver } from "@modules/adminProcessing/infrastructure/graphql/resolvers/adminProcessing.resolver";
import { AdminProcessorResolver } from "@modules/adminProcessor/infrastructure/graphql/resolvers/adminProcessor.resolver";
import { AdminWorkerResolver } from "@modules/adminWorker/infrastructure/graphql/resolvers/adminWorker.resolver";
import { AdminWorkerRegistrationTokenResolver } from "@modules/adminWorker/infrastructure/graphql/resolvers/adminWorkerRegistrationToken.resolver";
import { UserDatasetResolver } from "@modules/dataset/infrastructure/graphql/resolvers/userDataset.resolver";
import { UserDatasetFieldResolver } from "@modules/dataset/infrastructure/graphql/resolvers/userDatasetField.resolver";
import { FileFieldResolver } from "@modules/file/infrastructure/graphql/resolvers/fileField.resolver";
import { HealthCheckResolver } from "@modules/healthCheck/infrastructure/graphql/resolvers/healthCheck.resolver";
import { UserMcpAuthorizationGrantResolver } from "@modules/mcpAuthorization/infrastructure/graphql/resolvers/userMcpAuthorizationGrant.resolver";
import { ProcessingFieldResolver } from "@modules/processing/infrastructure/graphql/resolvers/processingField.resolver";
import { UserProcessingResolver } from "@modules/processing/infrastructure/graphql/resolvers/userProcessing.resolver";
import { UserProcessorResolver } from "@modules/processor/infrastructure/graphql/resolvers/userProcessor.resolver";
import { UserProcessorFieldResolver } from "@modules/processor/infrastructure/graphql/resolvers/userProcessorField.resolver";
import { UserResolver } from "@modules/user/infrastructure/graphql/resolvers/user.resolver";
import { UserSessionResolver } from "@modules/user/infrastructure/graphql/resolvers/userSession.resolver";
import { UserUpdateDataResolver } from "@modules/user/infrastructure/graphql/resolvers/userUpdateData.resolver";
import { WorkerResolver } from "@modules/worker/infrastructure/graphql/resolvers/worker.resolver";
import { WorkerFieldResolver } from "@modules/worker/infrastructure/graphql/resolvers/workerField.resolver";
import { WorkerProcessingResolver } from "@modules/worker/infrastructure/graphql/resolvers/workerProcessing.resolver";
import { WorkerProcessingFileResolver } from "@modules/worker/infrastructure/graphql/resolvers/workerProcessingFile.resolver";
import { WorkerRegistrationResolver } from "@modules/worker/infrastructure/graphql/resolvers/workerRegistration.resolver";

const { resolvers }: Pick<BuildSchemaOptions, "resolvers"> = {
  resolvers: [
    /**
     * General
     */
    HealthCheckResolver,
    FileFieldResolver,
    ProcessingFieldResolver,

    /**
     * Admin
     */
    AdminDatasetResolver,
    AdminFileResolver,
    AdminProcessingResolver,
    AdminProcessorResolver,
    AdminWorkerRegistrationTokenResolver,
    AdminWorkerResolver,

    /**
     * User
     */
    UserResolver,
    UserUpdateDataResolver,
    UserSessionResolver,
    UserDatasetResolver,
    UserDatasetFieldResolver,
    UserProcessorResolver,
    UserProcessorFieldResolver,
    UserProcessingResolver,
    UserMcpAuthorizationGrantResolver,

    /**
     * Worker
     */
    WorkerResolver,
    WorkerFieldResolver,
    WorkerProcessingResolver,
    WorkerProcessingFileResolver,
    WorkerRegistrationResolver,
  ],
};

export { resolvers };

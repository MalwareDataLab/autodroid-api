import { BuildSchemaOptions } from "type-graphql";

/**
 * General
 */
import { HealthCheckResolver } from "@modules/healthCheck/infrastructure/graphql/resolvers/healthCheck.resolver";
import { FileFieldResolver } from "@modules/file/infrastructure/graphql/resolvers/fileField.resolver";
/**
 * Admin
 */
import { AdminDatasetResolver } from "@modules/adminDataset/infrastructure/graphql/resolvers/adminDataset.resolver";
import { AdminProcessingResolver } from "@modules/adminProcessing/infrastructure/graphql/resolvers/adminProcessing.resolver";
import { AdminProcessorResolver } from "@modules/adminProcessor/infrastructure/graphql/resolvers/adminProcessor.resolver";
import { AdminWorkerRegistrationTokenResolver } from "@modules/adminWorker/infrastructure/graphql/resolvers/adminWorkerRegistrationToken.resolver";
import { AdminWorkerResolver } from "@modules/adminWorker/infrastructure/graphql/resolvers/adminWorker.resolver";

/**
 * User
 */
import { UserResolver } from "@modules/user/infrastructure/graphql/resolvers/user.resolver";
import { UserUpdateDataResolver } from "@modules/user/infrastructure/graphql/resolvers/userUpdateData.resolver";
import { UserSessionResolver } from "@modules/user/infrastructure/graphql/resolvers/userSession.resolver";
import { UserDatasetResolver } from "@modules/dataset/infrastructure/graphql/resolvers/userDataset.resolver";
import { UserDatasetFieldResolver } from "@modules/dataset/infrastructure/graphql/resolvers/userDatasetField.resolver";
import { UserProcessorResolver } from "@modules/processor/infrastructure/graphql/resolvers/userProcessor.resolver";
import { UserProcessorFieldResolver } from "@modules/processor/infrastructure/graphql/resolvers/userProcessorField.resolver";
import { UserProcessingResolver } from "@modules/processing/infrastructure/graphql/resolvers/userProcessing.resolver";

/**
 * Worker
 */
import { WorkerResolver } from "@modules/worker/infrastructure/graphql/resolvers/worker.resolver";
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

    /**
     * Admin
     */
    AdminDatasetResolver,
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

    /**
     * Worker
     */
    WorkerResolver,
    WorkerProcessingResolver,
    WorkerProcessingFileResolver,
    WorkerRegistrationResolver,
  ],
};

export { resolvers };

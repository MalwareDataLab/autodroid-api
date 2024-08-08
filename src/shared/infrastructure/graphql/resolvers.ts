import { BuildSchemaOptions } from "type-graphql";

/**
 * General
 */
import { FileResolver } from "@modules/file/infrastructure/graphql/resolvers/file.resolver";

/**
 * Admin
 */
import { AdminDatasetResolver } from "@modules/adminDataset/infrastructure/graphql/resolvers/adminDataset.resolver";
import { AdminProcessorResolver } from "@modules/adminProcessor/infrastructure/graphql/resolvers/adminProcessor.resolver";

/**
 * User
 */
import { UserResolver } from "@modules/user/infrastructure/graphql/resolvers/user.resolver";
import { UserUpdateDataResolver } from "@modules/user/infrastructure/graphql/resolvers/userUpdateData.resolver";
import { UserSessionResolver } from "@modules/user/infrastructure/graphql/resolvers/userSession.resolver";
import { UserDatasetResolver } from "@modules/dataset/infrastructure/graphql/resolvers/userDataset.resolver";
import { UserProcessorResolver } from "@modules/processor/infrastructure/graphql/resolvers/userProcessor.resolver";

const { resolvers }: Pick<BuildSchemaOptions, "resolvers"> = {
  resolvers: [
    /**
     * General
     */
    FileResolver,

    /**
     * Admin
     */
    AdminDatasetResolver,
    AdminProcessorResolver,

    /**
     * User
     */
    UserResolver,
    UserUpdateDataResolver,
    UserSessionResolver,
    UserDatasetResolver,
    UserProcessorResolver,
  ],
};

export { resolvers };

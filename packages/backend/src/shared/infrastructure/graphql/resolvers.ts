import { BuildSchemaOptions } from "type-graphql";

/**
 * General
 */
import { ProcessorResolver } from "@modules/processor/infrastructure/graphql/resolvers/processor.resolver";

/**
 * Admin
 */
import { AdminDatasetResolver } from "@modules/adminDataset/infrastructure/graphql/resolvers/userDataset.resolver";

/**
 * User
 */
import { UserResolver } from "@modules/user/infrastructure/graphql/resolvers/user.resolver";
import { UserUpdateDataResolver } from "@modules/user/infrastructure/graphql/resolvers/userUpdateData.resolver";
import { UserSessionResolver } from "@modules/user/infrastructure/graphql/resolvers/userSession.resolver";
import { UserDatasetResolver } from "@modules/dataset/infrastructure/graphql/resolvers/userDataset.resolver";

const { resolvers }: Pick<BuildSchemaOptions, "resolvers"> = {
  resolvers: [
    /**
     * General
     */
    ProcessorResolver,

    /**
     * Admin
     */
    AdminDatasetResolver,

    /**
     * User
     */
    UserResolver,
    UserUpdateDataResolver,
    UserSessionResolver,
    UserDatasetResolver,
  ],
};

export { resolvers };

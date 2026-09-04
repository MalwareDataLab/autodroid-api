import { Arg, Args, Authorized, Ctx, Mutation, Resolver } from "type-graphql";
import { container } from "tsyringe";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Service import
import { UserUpdateDataService } from "@modules/user/services/userUpdateData.service";

// Schema import
import {
  UserUpdateDataSchema,
  UserUpdateLearningDataSchema,
} from "@modules/user/schemas/userUpdateData.schema";
import { UserUpdateLearningDataService } from "@modules/user/services/userUpdateLearningData.service";

@Resolver()
class UserUpdateDataResolver {
  @Authorized()
  @Mutation(() => User)
  async userUpdateData(
    @Arg("data")
    data: UserUpdateDataSchema,
    @Ctx() { user_session, language }: GraphQLContext,
  ): Promise<User> {
    const userUpdateDataService = container.resolve(UserUpdateDataService);

    const user = await userUpdateDataService.execute({
      user: user_session.user,
      data,
      language,
    });

    return user;
  }

  @Authorized()
  @Mutation(() => User)
  async userUpdateLearningData(
    @Args()
    params: UserUpdateLearningDataSchema,

    @Ctx() { user_session, language }: GraphQLContext,
  ): Promise<User> {
    const userUpdateLearningDataService = container.resolve(
      UserUpdateLearningDataService,
    );

    const user = await userUpdateLearningDataService.execute({
      user: user_session.user,
      params,
      language,
    });

    return user;
  }
}

export { UserUpdateDataResolver };

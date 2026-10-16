import { container } from "tsyringe";
import { Arg, Args, Authorized, Ctx, Mutation, Resolver } from "type-graphql";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Schema import
import {
  UserUpdateDataSchema,
  UserUpdateLearningDataSchema,
} from "@modules/user/schemas/userUpdateData.schema";

// Service import
import { UserUpdateDataService } from "@modules/user/services/userUpdateData.service";
import { UserUpdateLearningDataService } from "@modules/user/services/userUpdateLearningData.service";

@Resolver()
class UserUpdateDataResolver {
  @Authorized()
  @Mutation(() => User)
  async userUpdateData(
    @Arg("data", { description: "Your profile fields." })
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

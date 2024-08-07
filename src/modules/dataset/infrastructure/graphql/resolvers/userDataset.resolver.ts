import { Arg, Authorized, Ctx, Mutation, Query } from "type-graphql";
import { container } from "tsyringe";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Schema import
import {
  UserDatasetCreateSchema,
  UserDatasetUpdateSchema,
} from "@modules/dataset/schemas/userDataset.schema";

// Service import
import { UserDatasetDeleteService } from "@modules/dataset/services/userDatasetDelete.service";
import { UserDatasetIndexService } from "@modules/dataset/services/userDatasetIndex.service";
import { UserDatasetShowService } from "@modules/dataset/services/userDatasetShow.service";
import { UserDatasetUpdateService } from "@modules/dataset/services/userDatasetUpdate.service";
import { UserDatasetRequestPublicationService } from "@modules/dataset/services/userDatasetRequestPublication.service";
import { UserDatasetCreateService } from "@modules/dataset/services/userDatasetCreate.service";

class UserDatasetResolver {
  @Authorized()
  @Query(() => [Dataset])
  async userDatasets(@Ctx() ctx: GraphQLContext): Promise<Dataset[]> {
    const userDatasetIndexService = container.resolve(UserDatasetIndexService);

    const datasets = await userDatasetIndexService.execute({
      user: ctx.session.user,
    });

    return datasets;
  }

  @Authorized()
  @Query(() => Dataset)
  async userDataset(
    @Arg("dataset_id") dataset_id: string,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Dataset> {
    const userDatasetShowService = container.resolve(UserDatasetShowService);

    const dataset = await userDatasetShowService.execute({
      dataset_id,

      user: session.user,
      language,
    });

    return dataset;
  }

  @Authorized()
  @Mutation(() => Dataset)
  async userDatasetCreate(
    @Arg("data") data: UserDatasetCreateSchema,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Dataset> {
    const userDatasetCreateService = container.resolve(
      UserDatasetCreateService,
    );

    const dataset = await userDatasetCreateService.execute({
      data,

      user: session.user,
      language,
    });

    return dataset;
  }

  @Authorized()
  @Mutation(() => Dataset)
  async userDatasetUpdate(
    @Arg("dataset_id") dataset_id: string,
    @Arg("data") data: UserDatasetUpdateSchema,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Dataset> {
    const userDatasetUpdateService = container.resolve(
      UserDatasetUpdateService,
    );

    const dataset = await userDatasetUpdateService.execute({
      dataset_id,
      data,

      user: session.user,
      language,
    });

    return dataset;
  }

  @Authorized()
  @Mutation(() => Dataset)
  async userDatasetDelete(
    @Arg("dataset_id") dataset_id: string,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Dataset> {
    const userDatasetDeleteService = container.resolve(
      UserDatasetDeleteService,
    );

    const dataset = await userDatasetDeleteService.execute({
      dataset_id,

      user: session.user,
      language,
    });

    return dataset;
  }

  @Authorized()
  @Mutation(() => Dataset)
  async userDatasetRequestPublication(
    @Arg("dataset_id") dataset_id: string,

    @Ctx() { language, session }: GraphQLContext,
  ) {
    const userDatasetRequestPublicationService = container.resolve(
      UserDatasetRequestPublicationService,
    );

    const dataset = await userDatasetRequestPublicationService.execute({
      dataset_id,

      user: session.user,
      language,
    });

    return dataset;
  }
}

export { UserDatasetResolver };

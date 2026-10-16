import { container } from "tsyringe";
import { Arg, Args, Authorized, Ctx, Mutation, Query } from "type-graphql";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Decorator import
import { SortingArg } from "@modules/sorting/infrastructure/graphql/decorators/sortingArg.decorator";

// Constant import
import { DatasetSortingOptions } from "@modules/dataset/constants/datasetSortingOptions.constant";

// Entity import
import {
  Dataset,
  PaginatedDataset,
} from "@modules/dataset/entities/dataset.entity";

// Schema import
import {
  UserDatasetCreateSchema,
  UserDatasetUpdateSchema,
} from "@modules/dataset/schemas/userDataset.schema";
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

// Service import
import { UserDatasetCreateService } from "@modules/dataset/services/userDatasetCreate.service";
import { UserDatasetDeleteService } from "@modules/dataset/services/userDatasetDelete.service";
import { UserDatasetIndexService } from "@modules/dataset/services/userDatasetIndex.service";
import { UserDatasetRequestPublicationService } from "@modules/dataset/services/userDatasetRequestPublication.service";
import { UserDatasetShowService } from "@modules/dataset/services/userDatasetShow.service";
import { UserDatasetUpdateService } from "@modules/dataset/services/userDatasetUpdate.service";

class UserDatasetResolver {
  @Authorized()
  @Query(() => PaginatedDataset)
  async userDatasets(
    @Args() pagination: PaginationSchema,
    @SortingArg<Dataset>(DatasetSortingOptions)
    sorting: SortingFieldSchema<typeof DatasetSortingOptions>[],

    @Ctx() ctx: GraphQLContext,
  ): Promise<PaginatedDataset> {
    const userDatasetIndexService = container.resolve(UserDatasetIndexService);

    const paginatedDatasets = await userDatasetIndexService.execute({
      user: ctx.user_session.user,

      pagination,
      sorting,
    });

    return paginatedDatasets;
  }

  @Authorized()
  @Query(() => Dataset)
  async userDataset(
    @Arg("dataset_id", { description: "The dataset id." }) dataset_id: string,

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<Dataset> {
    const userDatasetShowService = container.resolve(UserDatasetShowService);

    const dataset = await userDatasetShowService.execute({
      dataset_id,

      user: user_session.user,
      language,
    });

    return dataset;
  }

  @Authorized()
  @Mutation(() => Dataset)
  async userDatasetCreate(
    @Arg("data", {
      description: "The dataset to register, described by its file.",
    })
    data: UserDatasetCreateSchema,

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<Dataset> {
    const userDatasetCreateService = container.resolve(
      UserDatasetCreateService,
    );

    const dataset = await userDatasetCreateService.execute({
      data,

      user: user_session.user,
      language,
    });

    return dataset;
  }

  @Authorized()
  @Mutation(() => Dataset)
  async userDatasetUpdate(
    @Arg("dataset_id", { description: "The dataset id." }) dataset_id: string,
    @Arg("data", { description: "The new description and tags." })
    data: UserDatasetUpdateSchema,

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<Dataset> {
    const userDatasetUpdateService = container.resolve(
      UserDatasetUpdateService,
    );

    const dataset = await userDatasetUpdateService.execute({
      dataset_id,
      data,

      user: user_session.user,
      language,
    });

    return dataset;
  }

  @Authorized()
  @Mutation(() => Dataset)
  async userDatasetDelete(
    @Arg("dataset_id", { description: "The dataset id." }) dataset_id: string,

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<Dataset> {
    const userDatasetDeleteService = container.resolve(
      UserDatasetDeleteService,
    );

    const dataset = await userDatasetDeleteService.execute({
      dataset_id,

      user: user_session.user,
      language,
    });

    return dataset;
  }

  @Authorized()
  @Mutation(() => Dataset)
  async userDatasetRequestPublication(
    @Arg("dataset_id", { description: "The dataset id." }) dataset_id: string,

    @Ctx() { language, user_session }: GraphQLContext,
  ) {
    const userDatasetRequestPublicationService = container.resolve(
      UserDatasetRequestPublicationService,
    );

    const dataset = await userDatasetRequestPublicationService.execute({
      dataset_id,

      user: user_session.user,
      language,
    });

    return dataset;
  }
}

export { UserDatasetResolver };

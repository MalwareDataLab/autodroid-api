import { Arg, Args, Authorized, Ctx, Mutation, Query } from "type-graphql";
import { container } from "tsyringe";

// Constant import
import { DatasetSortingOptions } from "@modules/dataset/constants/datasetSortingOptions.constant";

// Entity import
import {
  Dataset,
  PaginatedDataset,
} from "@modules/dataset/entities/dataset.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Decorator import
import { SortingArg } from "@modules/sorting/infrastructure/graphql/decorators/sortingArg.decorator";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
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
    @Arg("dataset_id") dataset_id: string,

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
    @Arg("data") data: UserDatasetCreateSchema,

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
    @Arg("dataset_id") dataset_id: string,
    @Arg("data") data: UserDatasetUpdateSchema,

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
    @Arg("dataset_id") dataset_id: string,

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
    @Arg("dataset_id") dataset_id: string,

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

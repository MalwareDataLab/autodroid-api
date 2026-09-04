import {
  Arg,
  Args,
  Authorized,
  Ctx,
  Directive,
  Mutation,
  Query,
} from "type-graphql";
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
  AdminDatasetIndexSchema,
  AdminDatasetUpdateSchema,
  AdminDatasetUpdateVisibilitySchema,
} from "@modules/adminDataset/schemas/adminDataset.schema";

// Service import
import { AdminDatasetDeleteService } from "@modules/adminDataset/services/adminDatasetDelete.service";
import { AdminDatasetIndexService } from "@modules/adminDataset/services/adminDatasetIndex.service";
import { AdminDatasetShowService } from "@modules/adminDataset/services/adminDatasetShow.service";
import { AdminDatasetUpdateService } from "@modules/adminDataset/services/adminDatasetUpdate.service";
import { AdminDatasetUpdateVisibilityService } from "@modules/adminDataset/services/adminDatasetUpdateVisibility.service";

class AdminDatasetResolver {
  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Query(() => PaginatedDataset)
  async adminDatasets(
    @Args() filter: AdminDatasetIndexSchema,

    @Args() pagination: PaginationSchema,
    @SortingArg<Dataset>(DatasetSortingOptions)
    sorting: SortingFieldSchema<typeof DatasetSortingOptions>[],

    @Ctx() { user_session }: GraphQLContext,
  ): Promise<PaginatedDataset> {
    const adminDatasetIndexService = container.resolve(
      AdminDatasetIndexService,
    );

    const paginatedDatasets = await adminDatasetIndexService.execute({
      user: user_session.user,

      filter,

      pagination,
      sorting,
    });

    return paginatedDatasets;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Query(() => Dataset)
  async adminDataset(
    @Arg("dataset_id") dataset_id: string,

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<Dataset> {
    const adminDatasetShowService = container.resolve(AdminDatasetShowService);

    const dataset = await adminDatasetShowService.execute({
      dataset_id,

      user: user_session.user,
      language,
    });

    return dataset;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Dataset)
  async adminDatasetUpdate(
    @Arg("dataset_id") dataset_id: string,
    @Arg("data") data: AdminDatasetUpdateSchema,

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<Dataset> {
    const adminDatasetUpdateService = container.resolve(
      AdminDatasetUpdateService,
    );

    const dataset = await adminDatasetUpdateService.execute({
      dataset_id,
      data,

      user: user_session.user,
      language,
    });

    return dataset;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Dataset)
  async adminDatasetDelete(
    @Arg("dataset_id") dataset_id: string,

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<Dataset> {
    const adminDatasetDeleteService = container.resolve(
      AdminDatasetDeleteService,
    );

    const dataset = await adminDatasetDeleteService.execute({
      dataset_id,

      user: user_session.user,
      language,
    });

    return dataset;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Dataset)
  async adminDatasetUpdateVisibility(
    @Arg("dataset_id") dataset_id: string,
    @Arg("data") data: AdminDatasetUpdateVisibilitySchema,

    @Ctx() { language, user_session }: GraphQLContext,
  ) {
    const adminDatasetUpdateVisibilityService = container.resolve(
      AdminDatasetUpdateVisibilityService,
    );

    const dataset = await adminDatasetUpdateVisibilityService.execute({
      dataset_id,
      data,

      user: user_session.user,
      language,
    });

    return dataset;
  }
}

export { AdminDatasetResolver };

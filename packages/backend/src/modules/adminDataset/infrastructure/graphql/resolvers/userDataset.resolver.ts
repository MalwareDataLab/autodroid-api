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

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Schema import
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
  @Query(() => [Dataset])
  async adminDatasets(
    @Args() filter: AdminDatasetIndexSchema,
    @Ctx() { session }: GraphQLContext,
  ): Promise<Dataset[]> {
    const adminDatasetIndexService = container.resolve(
      AdminDatasetIndexService,
    );

    const datasets = await adminDatasetIndexService.execute({
      filter,
      user: session.user,
    });

    return datasets;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Query(() => Dataset)
  async adminDataset(
    @Arg("dataset_id") dataset_id: string,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Dataset> {
    const adminDatasetShowService = container.resolve(AdminDatasetShowService);

    const dataset = await adminDatasetShowService.execute({
      dataset_id,

      user: session.user,
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

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Dataset> {
    const adminDatasetUpdateService = container.resolve(
      AdminDatasetUpdateService,
    );

    const dataset = await adminDatasetUpdateService.execute({
      dataset_id,
      data,

      user: session.user,
      language,
    });

    return dataset;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Dataset)
  async adminDatasetDelete(
    @Arg("dataset_id") dataset_id: string,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Dataset> {
    const adminDatasetDeleteService = container.resolve(
      AdminDatasetDeleteService,
    );

    const dataset = await adminDatasetDeleteService.execute({
      dataset_id,

      user: session.user,
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

    @Ctx() { language, session }: GraphQLContext,
  ) {
    const adminDatasetUpdateVisibilityService = container.resolve(
      AdminDatasetUpdateVisibilityService,
    );

    const dataset = await adminDatasetUpdateVisibilityService.execute({
      dataset_id,
      data,

      user: session.user,
      language,
    });

    return dataset;
  }
}

export { AdminDatasetResolver };

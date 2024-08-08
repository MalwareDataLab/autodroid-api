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
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// Entity import
import {
  Processor,
  PaginatedProcessor,
} from "@modules/processor/entities/processor.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Decorator import
import { SortingArg } from "@modules/sorting/infrastructure/graphql/decorators/sortingArg.decorator";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import { ProcessorSchema } from "@modules/processor/schemas/processor.schema";

// Service import
import { AdminProcessorIndexService } from "@modules/adminProcessor/services/adminProcessorIndex.service";
import { AdminProcessorShowService } from "@modules/adminProcessor/services/adminProcessorShow.service";
import { AdminProcessorCreateService } from "@modules/adminProcessor/services/adminProcessorCreate.service";
import { AdminProcessorUpdateService } from "@modules/adminProcessor/services/adminProcessorUpdate.service";
import { AdminProcessorDeleteService } from "@modules/adminProcessor/services/adminProcessorDelete.service";

class AdminProcessorResolver {
  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Query(() => PaginatedProcessor)
  async adminProcessors(
    @Args() pagination: PaginationSchema,
    @SortingArg<Processor>(ProcessorSortingOptions)
    sorting: SortingFieldSchema<typeof ProcessorSortingOptions>[],

    @Ctx() { session, language }: GraphQLContext,
  ): Promise<PaginatedProcessor> {
    const adminProcessorIndexService = container.resolve(
      AdminProcessorIndexService,
    );

    const paginatedProcessors = await adminProcessorIndexService.execute({
      user: session.user,

      pagination,
      sorting,

      language,
    });

    return paginatedProcessors;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Query(() => Processor)
  async adminProcessor(
    @Arg("processor_id") processor_id: string,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Processor> {
    const adminProcessorShowService = container.resolve(
      AdminProcessorShowService,
    );

    const processor = await adminProcessorShowService.execute({
      processor_id,

      user: session.user,
      language,
    });

    return processor;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Processor)
  async adminProcessorCreate(
    @Arg("data") data: ProcessorSchema,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Processor> {
    const adminProcessorCreateService = container.resolve(
      AdminProcessorCreateService,
    );

    const processor = await adminProcessorCreateService.execute({
      data,

      user: session.user,
      language,
    });

    return processor;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Processor)
  async adminProcessorUpdate(
    @Arg("processor_id") processor_id: string,
    @Arg("data") data: ProcessorSchema,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Processor> {
    const adminProcessorUpdateService = container.resolve(
      AdminProcessorUpdateService,
    );

    const processor = await adminProcessorUpdateService.execute({
      processor_id,
      data,

      user: session.user,
      language,
    });

    return processor;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Processor)
  async adminProcessorDelete(
    @Arg("processor_id") processor_id: string,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Processor> {
    const adminProcessorDeleteService = container.resolve(
      AdminProcessorDeleteService,
    );

    const processor = await adminProcessorDeleteService.execute({
      processor_id,

      user: session.user,
      language,
    });

    return processor;
  }
}

export { AdminProcessorResolver };

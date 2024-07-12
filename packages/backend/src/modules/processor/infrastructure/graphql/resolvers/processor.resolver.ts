import { Arg, Authorized, Ctx, Query } from "type-graphql";
import { container } from "tsyringe";

// Entity import
import { Processor } from "@modules/processor/entities/processor.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { ProcessorIndexService } from "@modules/processor/services/processorIndex.service";
import { ProcessorShowService } from "@modules/processor/services/processorShow.service";

class ProcessorResolver {
  @Authorized()
  @Query(() => [Processor])
  async processors(): Promise<Processor[]> {
    const processorIndexService = container.resolve(ProcessorIndexService);

    const processors = await processorIndexService.execute();

    return processors;
  }

  @Authorized()
  @Query(() => Processor)
  async processor(
    @Arg("code", { validate: true })
    code: string,

    @Ctx() { language }: GraphQLContext,
  ): Promise<Processor> {
    const processorShowService = container.resolve(ProcessorShowService);

    const processor = await processorShowService.execute({
      code,

      language,
    });

    return processor;
  }
}

export { ProcessorResolver };

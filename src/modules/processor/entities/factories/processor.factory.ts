import { container } from "tsyringe";
import { faker } from "@faker-js/faker";
import { Factory } from "fishery";
import { plainToInstance } from "class-transformer";

// Entity import
import { Processor } from "@modules/processor/entities/processor.entity";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Type import
import { FactoryParams } from "@/test/types/factoryParams.type";
import {
  IProcessorBase,
  ProcessorRelationFields,
} from "@modules/processor/types/IProcessor.dto";

// Enum import
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Util import
import { generateEntityBaseData } from "@/test/utils/generateEntityBaseData.util";
import { getBaseFactoryEntityData } from "@/test/utils/getBaseFactoryEntityData.util";
import { loadEntityRelations } from "@/test/utils/loadEntityRelations.util";

class ProcessorFactory extends Factory<Processor, FactoryParams> {
  static get repository() {
    return container.resolve("ProcessorRepository");
  }
}

const processorFactory = ProcessorFactory.define(
  ({ onCreate, associations, transientParams }) => {
    const user = associations.user || userFactory.build();

    const base: IProcessorBase = {
      /** Base */
      ...generateEntityBaseData(),

      /** Entity */
      name: faker.system.fileName(),
      description: faker.word.words(3),
      tags: "one,two,three",
      allowed_mime_types: "image/png",
      image_tag: faker.system.fileName(),
      version: faker.system.semver(),
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
      payload: {},
      configuration: {
        parameters: [],
        dataset_input_argument: "",
        dataset_input_value: "",
        dataset_output_argument: "",
        dataset_output_value: "",
        command: "",
      },

      /** Simulated */

      /** Relations */
      user_id: user.id,
    };

    onCreate(async item => {
      return ProcessorFactory.repository.createOne(
        getBaseFactoryEntityData({
          base,
          item: await loadEntityRelations(item, ["user"]),
        }),
      );
    });

    return plainToInstance(Processor, {
      ...base,
      ...associations,

      ...(transientParams.withRelations &&
        ({
          user,

          processes: [],
        } satisfies Pick<Processor, ProcessorRelationFields>)),
    });
  },
);

export { processorFactory };

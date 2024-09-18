import { faker } from "@faker-js/faker";
import crypto from "node:crypto";

// Entity import
import { Processor } from "@modules/processor/entities/processor.entity";

// Type import
import {
  IProcessorBase,
  ProcessorRelationFields,
} from "@modules/processor/types/IProcessor.dto";

// Enum import
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

class ProcessorFactory extends Processor {
  public static make({
    required,
    relations = {},
    overrides = {},
  }: {
    required: Pick<Processor, "user_id">;
    relations?: Partial<Pick<Processor, ProcessorRelationFields>>;
    overrides?: Partial<Processor>;
  }) {
    const entity = new ProcessorFactory();

    const data: IProcessorBase = {
      /** Base */
      id: crypto.randomUUID(),
      created_at: faker.date.past(),
      updated_at: faker.date.past(),

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

      /** Relations */
      user_id: required.user_id,

      ...overrides,
    };

    Object.assign(entity, {
      ...data,
      ...relations,
      ...overrides,
    });

    return entity;
  }
}

export { ProcessorFactory };

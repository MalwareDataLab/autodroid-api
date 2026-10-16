import { faker } from "@faker-js/faker";
import { plainToInstance } from "class-transformer";
import { Factory } from "fishery";
import { container } from "tsyringe";

// Util import
import { generateEntityBaseData } from "@/test/utils/generateEntityBaseData.util";
import { getBaseFactoryEntityData } from "@/test/utils/getBaseFactoryEntityData.util";
import { loadEntityRelations } from "@/test/utils/loadEntityRelations.util";

// Type import
import { FactoryParams } from "@/test/types/factoryParams.type";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// DTO import
import {
  IProcessingBase,
  ProcessingRelationFields,
} from "@modules/processing/types/IProcessing.dto";

// Entity import
import { Processing } from "@modules/processing/entities/processing.entity";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

class ProcessingFactory extends Factory<Processing, FactoryParams> {
  static get repository() {
    return container.resolve("ProcessingRepository");
  }
}

const processingFactory = ProcessingFactory.define(
  ({ onCreate, associations }) => {
    const user = associations.user || userFactory.build();
    const dataset = associations.dataset || datasetFactory.build();
    const processor = associations.processor || processorFactory.build();

    const base: IProcessingBase = {
      /** Base */
      ...generateEntityBaseData(),

      /** Entity */
      status: faker.helpers.arrayElement(Object.values(PROCESSING_STATUS)),
      visibility: faker.helpers.arrayElement(
        Object.values(PROCESSING_VISIBILITY),
      ),
      started_at: null,
      finished_at: null,
      keep_until: null,
      archived_at: null,
      verified_at: null,
      attempts: 0,
      message: null,
      reported_at: null,
      configuration: {},
      payload: {},

      /** Relations */
      user_id: user.id,
      processor_id: processor.id,
      dataset_id: dataset.id,
      worker_id: null,
      result_file_id: null,
      metrics_file_id: null,
    };

    onCreate(async item => {
      return ProcessingFactory.repository.createOne(
        getBaseFactoryEntityData({
          base,
          item: await loadEntityRelations<
            ProcessingRelationFields,
            typeof item
          >(item, {
            user: {
              reference: "user",
              foreignKey: "user_id",
            },
            dataset: {
              reference: "dataset",
              foreignKey: "dataset_id",
            },
            processor: {
              reference: "processor",
              foreignKey: "processor_id",
            },
            metrics_file: {
              reference: "file",
              foreignKey: "metrics_file_id",
            },
            result_file: {
              reference: "file",
              foreignKey: "result_file_id",
            },
            worker: {
              reference: "worker",
              foreignKey: "worker_id",
            },
          }),
        }),
      );
    });

    return plainToInstance(
      Processing,
      {
        ...base,
        ...associations,
      },
      { ignoreDecorators: true, enableCircularCheck: true },
    );
  },
);

export { processingFactory };

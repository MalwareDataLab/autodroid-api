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
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// DTO import
import {
  DatasetRelationFields,
  IDatasetBase,
} from "@modules/dataset/types/IDataset.dto";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

class DatasetFactory extends Factory<Dataset, FactoryParams> {
  static get repository() {
    return container.resolve("DatasetRepository");
  }
}

const datasetFactory = DatasetFactory.define(
  ({ onCreate, associations, transientParams }) => {
    const user = associations.user || userFactory.build();
    const file = associations.file || fileFactory.build();

    const base: IDatasetBase = {
      /** Base */
      ...generateEntityBaseData(),

      /** Entity */
      description: faker.word.words(3),
      tags: "one,two,three",
      visibility: DATASET_VISIBILITY.PRIVATE,

      /** Simulated */

      /** Relations */
      user_id: user.id,
      file_id: file.id,
    };

    onCreate(async item => {
      return DatasetFactory.repository.createOne(
        getBaseFactoryEntityData({
          base,
          item: await loadEntityRelations<DatasetRelationFields, typeof item>(
            item,
            {
              user: {
                reference: "user",
                foreignKey: "user_id",
              },
              file: {
                reference: "file",
                foreignKey: "file_id",
              },
            },
          ),
        }),
      );
    });

    return plainToInstance(Dataset, {
      ...base,
      ...associations,

      ...(transientParams.withRelations &&
        ({
          user,
          file,
          processes: [],
        } satisfies Pick<Dataset, DatasetRelationFields>)),
    });
  },
);

export { datasetFactory };

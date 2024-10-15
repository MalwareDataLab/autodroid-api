import { container } from "tsyringe";
import { faker } from "@faker-js/faker";
import { Factory } from "fishery";
import { plainToInstance } from "class-transformer";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Type import
import { FactoryParams } from "@/test/types/factoryParams.type";
import {
  DatasetRelationFields,
  IDatasetBase,
} from "@modules/dataset/types/IDataset.dto";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Util import
import { generateEntityBaseData } from "@/test/utils/generateEntityBaseData.util";
import { getBaseFactoryEntityData } from "@/test/utils/getBaseFactoryEntityData.util";
import { loadEntityRelations } from "@/test/utils/loadEntityRelations.util";

class DatasetFactory extends Factory<Dataset, FactoryParams> {
  static get repository() {
    return container.resolve("DatasetRepository");
  }

  static async createDependencies(item: Dataset) {
    const userRepository = container.resolve("UserRepository");

    const user =
      (item.user_id
        ? await userRepository.findOne({
            id: item.user_id,
          })
        : null) || (await userFactory.create());

    Object.assign(item, {
      user_id: user.id,
      user,
    } as Dataset);

    return item;
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
          item: await loadEntityRelations(item, ["user", "file"]),
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

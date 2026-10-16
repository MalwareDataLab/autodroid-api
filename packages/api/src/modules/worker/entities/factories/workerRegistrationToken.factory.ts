import { plainToInstance } from "class-transformer";
import { Factory } from "fishery";
import { container } from "tsyringe";

// Util import
import { generateEntityBaseData } from "@/test/utils/generateEntityBaseData.util";
import { getBaseFactoryEntityData } from "@/test/utils/getBaseFactoryEntityData.util";
import { loadEntityRelations } from "@/test/utils/loadEntityRelations.util";
import { generateToken } from "@shared/utils/generateToken";

// Type import
import { FactoryParams } from "@/test/types/factoryParams.type";

// DTO import
import {
  IWorkerRegistrationTokenBase,
  WorkerRegistrationTokenRelationFields,
} from "@modules/worker/types/IWorkerRegistrationToken.dto";

// Entity import
import { WorkerRegistrationToken } from "@modules/worker/entities/workerRegistrationToken.entity";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

class WorkerRegistrationTokenFactory extends Factory<
  WorkerRegistrationToken,
  FactoryParams
> {
  static get repository() {
    return container.resolve("WorkerRegistrationTokenRepository");
  }
}

const workerRegistrationTokenFactory = WorkerRegistrationTokenFactory.define(
  ({ onCreate, associations }) => {
    const user = associations.user || userFactory.build();

    const base: IWorkerRegistrationTokenBase = {
      /** Base */
      ...generateEntityBaseData(),

      /** Entity */
      token: generateToken(),
      is_unlimited_usage: false,
      activated_at: null,
      expires_at: null,
      archived_at: null,

      /** Relations */
      user_id: user.id,
    };

    onCreate(async item => {
      return WorkerRegistrationTokenFactory.repository.createOne(
        getBaseFactoryEntityData({
          base,
          item: await loadEntityRelations<
            WorkerRegistrationTokenRelationFields,
            typeof item
          >(item, {
            user: {
              reference: "user",
              foreignKey: "user_id",
            },
          }),
        }),
      );
    });

    return plainToInstance(
      WorkerRegistrationToken,
      {
        ...base,
        ...associations,
      },
      { ignoreDecorators: true, enableCircularCheck: true },
    );
  },
);

export { workerRegistrationTokenFactory };

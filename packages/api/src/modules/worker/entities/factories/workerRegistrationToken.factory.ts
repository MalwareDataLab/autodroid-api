import { plainToInstance } from "class-transformer";
import { container } from "tsyringe";
import { Factory } from "fishery";

// Util import
import { generateToken } from "@shared/utils/generateToken";
import { loadEntityRelations } from "@/test/utils/loadEntityRelations.util";
import { generateEntityBaseData } from "@/test/utils/generateEntityBaseData.util";
import { getBaseFactoryEntityData } from "@/test/utils/getBaseFactoryEntityData.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Entity import
import { WorkerRegistrationToken } from "@modules/worker/entities/workerRegistrationToken.entity";

// Type import
import { FactoryParams } from "@/test/types/factoryParams.type";
import {
  IWorkerRegistrationTokenBase,
  WorkerRegistrationTokenRelationFields,
} from "@modules/worker/types/IWorkerRegistrationToken.dto";

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

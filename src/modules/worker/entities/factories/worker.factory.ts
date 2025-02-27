import { plainToInstance } from "class-transformer";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";
import { Factory } from "fishery";

// Util import
import { loadEntityRelations } from "@/test/utils/loadEntityRelations.util";
import { generateEntityBaseData } from "@/test/utils/generateEntityBaseData.util";
import { getBaseFactoryEntityData } from "@/test/utils/getBaseFactoryEntityData.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Entity import
import { Worker } from "@modules/worker/entities/worker.entity";

// Type import
import { FactoryParams } from "@/test/types/factoryParams.type";
import {
  IWorkerBase,
  WorkerRelationFields,
} from "@modules/worker/types/IWorker.dto";

class WorkerFactory extends Factory<Worker, FactoryParams> {
  static get repository() {
    return container.resolve("WorkerRepository");
  }
}

const workerFactory = WorkerFactory.define(({ onCreate, associations }) => {
  const user = associations.user || userFactory.build();
  const registration_token =
    associations.registration_token || workerRegistrationTokenFactory.build();

  const base: IWorkerBase = {
    /** Base */
    ...generateEntityBaseData(),

    /** Entity */
    refresh_token: faker.internet.jwt(),
    refresh_token_expires_at: faker.date.future(),
    internal_id: faker.string.alphanumeric(10),
    signature: faker.string.uuid(),
    missing: false,
    version: faker.system.semver(),
    system_info: {
      os: "Linux",
      cpu: faker.helpers.arrayElement(["x86_64", "arm64"]),
      memory: faker.number.int({ min: 1024, max: 16384 }),
    },
    agent_info: {
      version: faker.system.semver(),
      uptime: faker.number.int({ min: 60, max: 86400 }),
    },
    payload: {},

    description: faker.helpers.arrayElement([faker.lorem.sentence(), null]),
    tags: faker.helpers.arrayElement([faker.lorem.words(3), null]),
    last_seen_at: faker.helpers.arrayElement([faker.date.recent(), null]),
    archived_at: null,

    /** Relations */
    user_id: user.id,
    registration_token_id: registration_token.id,
  };

  onCreate(async item => {
    return WorkerFactory.repository.createOne(
      getBaseFactoryEntityData({
        base,
        item: await loadEntityRelations<WorkerRelationFields, typeof item>(
          item,
          {
            user: {
              reference: "user",
              foreignKey: "user_id",
            },
            registration_token: {
              reference: "workerRegistrationToken",
              foreignKey: "registration_token_id",
            },
          },
        ),
      }),
    );
  });

  return plainToInstance(
    Worker,
    {
      ...base,
      ...associations,
    },
    { ignoreDecorators: true, enableCircularCheck: true },
  );
});

export { workerFactory };

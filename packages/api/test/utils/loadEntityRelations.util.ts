import { container } from "tsyringe";

// Repository import
import { RepositoryToken } from "@shared/container/repositories";

// Factory import
import { getFactories } from "../factories";

const relationMap = {
  user: "UserRepository",
  dataset: "DatasetRepository",
  file: "FileRepository",
  processor: "ProcessorRepository",
  processing: "ProcessingRepository",

  worker: "WorkerRepository",
  workerRegistrationToken: "WorkerRegistrationTokenRepository",
} as const satisfies Record<string, RepositoryToken>;

type RelationMap = typeof relationMap;
type RelationMapKey = keyof RelationMap;

type RelationConfig<DATA extends Record<string, any>> = {
  reference: RelationMapKey;
  foreignKey: keyof DATA;
};

type RemoveNeverProperties<T> = Pick<
  T,
  {
    [K in keyof T]: T[K] extends never ? never : K;
  }[keyof T]
>;

type Relations<
  KEYS extends string,
  DATA extends Record<string, any>,
> = RemoveNeverProperties<{
  [K in KEYS]: DATA[K] extends any[] ? never : RelationConfig<DATA> | null;
}>;

type Result<KEYS extends string, DATA extends Record<KEYS | string, any>> = {
  [K in KEYS]: DATA[K];
};

const loadEntityRelations = async <
  KEYS extends string,
  DATA extends Record<KEYS | string, any>,
>(
  data: DATA,
  relations: Relations<KEYS, DATA>,
): Promise<Result<KEYS, DATA>> => {
  const loadedRelations = await Object.entries<RelationConfig<DATA> | null>(
    relations,
  ).reduce(
    (previousPromise, [relation, config]) =>
      previousPromise.then(async total => {
        if (!config) return total;

        const { reference, foreignKey } = config;
        const repository = relationMap[reference];
        if (!repository)
          throw new Error(
            `Relation not found for relation ${relation} for ${reference}`,
          );

        const factory = getFactories()[reference];
        if (!factory)
          throw new Error(`Factory not found for relation ${relation}`);

        const repositoryEntityId = data[foreignKey];

        const repositoryEntity = repositoryEntityId
          ? await container.resolve(repository).findOne({
              id: repositoryEntityId,
            })
          : null;

        const entity =
          repositoryEntity || (await factory.create(data[relation]));

        if (!entity)
          throw new Error(`Fail to load relation ${relation} for ${reference}`);

        const result = total;

        Object.assign(result, {
          [foreignKey]: entity.id,
          [relation]: entity,
        });

        return result;
      }),
    Promise.resolve({}),
  );

  const result = data;
  Object.assign(result, loadedRelations);
  return result;
};

export { loadEntityRelations };

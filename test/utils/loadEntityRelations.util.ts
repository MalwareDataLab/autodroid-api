import { container } from "tsyringe";
import { Factory } from "fishery";

// Repository import
import { Repository, RepositoryToken } from "@shared/container/repositories";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

const relationMap = {
  user: "UserRepository",
  dataset: "DatasetRepository",
  file: "FileRepository",
} as const satisfies Record<string, RepositoryToken>;

type RelationMap = typeof relationMap;
type RelationMapKey = keyof RelationMap;

const relationFactoryMap = {
  user: userFactory,
  dataset: datasetFactory,
  file: fileFactory,
} as const satisfies Record<RelationMapKey, Factory<any, any>>;

type RelationResult<R extends RelationMapKey[]> = {
  [K in R[number]]: Awaited<ReturnType<Repository<RelationMap[K]>["findOne"]>>;
};

const loadEntityRelations = async <
  T extends Record<string, any>,
  R extends RelationMapKey[],
>(
  data: T & { [K in R[number] as `${K}_id`]: string },
  relations: R,
): Promise<T & RelationResult<R>> => {
  const loadedRelations = await relations.reduce(
    (previousPromise, relation) =>
      previousPromise.then(async total => {
        const repository = relationMap[relation];
        if (!repository)
          throw new Error(`Relation not found for relation ${relation}`);

        const factory = relationFactoryMap[relation];
        if (!factory)
          throw new Error(`Factory not found for relation ${relation}`);

        const repositoryForeignKey = `${relation}_id`;
        const repositoryEntityId = data[repositoryForeignKey];

        const repositoryEntity = repositoryEntityId
          ? await container
              .resolve(repository)
              .findOne({ id: repositoryEntityId })
          : null;

        const entity = repositoryEntity || (await factory.create());

        if (!entity) throw new Error(`Fail to load relation ${relation}`);

        const result = total;

        const key = relation as R[number];
        result[key] = entity as RelationResult<R>[typeof key];

        return result;
      }),
    Promise.resolve({}) as Promise<RelationResult<R>>,
  );

  const result = data;
  Object.assign(result, loadedRelations);
  return result;
};

export { loadEntityRelations };

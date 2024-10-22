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

type RelationList<T extends Record<string, any>, K = RelationMapKey> = {
  relation: K extends keyof T ? K : never;
  foreignKey: keyof T;
}[];

type RelationResult<
  T extends Record<string, any>,
  R extends RelationList<T>,
> = {
  [K in R[number]["relation"]]: Awaited<
    ReturnType<Repository<RelationMap[K]>["findOne"]>
  >;
};

const loadEntityRelations = async <
  T extends Record<string, any>,
  R extends RelationList<T>,
>(
  data: T & { [FK in R[number]["foreignKey"]]: T[FK] } & {
    [K in R[number]["relation"]]: T[K];
  },
  relations: R,
): Promise<T & RelationResult<T, R>> => {
  const loadedRelations = await relations.reduce(
    (previousPromise, { relation, foreignKey }) =>
      previousPromise.then(async total => {
        const repository = relationMap[relation];
        if (!repository)
          throw new Error(`Relation not found for relation ${relation}`);

        const factory = relationFactoryMap[relation];
        if (!factory)
          throw new Error(`Factory not found for relation ${relation}`);

        const repositoryEntityId = data[foreignKey];

        const repositoryEntity = repositoryEntityId
          ? await container
              .resolve(repository)
              .findOne({ id: repositoryEntityId })
          : null;

        const entity = repositoryEntity || (await factory.create());

        if (!entity) throw new Error(`Fail to load relation ${relation}`);

        const result = total;

        const key = relation as R[number]["foreignKey"];
        Object.assign(result, {
          [foreignKey]: entity.id,
          [key]: entity,
        });

        return result;
      }),
    Promise.resolve({}) as Promise<R>,
  );

  const result = data;
  Object.assign(result, loadedRelations);
  return result;
};

export { loadEntityRelations };

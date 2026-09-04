import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { File } from "@modules/file/entities/file.entity";

// Repository import
import { IDatasetRepository } from "@shared/container/repositories";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

describe("Repository: PrismaDatasetRepository", () => {
  let repository: IDatasetRepository;
  let user: User;
  let file: File;

  beforeEach(async () => {
    repository = container.resolve("DatasetRepository");
    user = await userFactory.create();
    file = await fileFactory.create();
  });

  it("should create and find one dataset", async () => {
    const created = await repository.createOne({
      description: faker.word.words(3),
      tags: "one,two,three",
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
      file_id: file.id,
    });

    const found = await repository.findOne({ id: created.id });

    expect(found?.id).toBe(created.id);
    expect(found?.user_id).toBe(user.id);
    expect(found?.file_id).toBe(file.id);
  });

  it("should return null finding a dataset that does not exist", async () => {
    const found = await repository.findOne({ id: faker.string.uuid() });

    expect(found).toBeNull();
  });

  it("should find many datasets filtered by user_id with pagination and sorting", async () => {
    const owned = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });
    const otherUser = await userFactory.create();
    await datasetFactory.create({
      user_id: otherUser.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const result = await repository.findMany(
      { user_id: user.id },
      { skip: 0, take: 10 },
      [{ field: "created_at", order: SORT_ORDER.ASC }],
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(owned.id);
  });

  it("should find many datasets filtered by visibility and file_id", async () => {
    const dataset = await datasetFactory.create({
      user_id: user.id,
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });

    const result = await repository.findMany({
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });

    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: dataset.id })]),
    );
  });

  it("should find public datasets and own private datasets, excluding others private", async () => {
    const otherUser = await userFactory.create();

    const publicOther = await datasetFactory.create({
      user_id: otherUser.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const privateOwned = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });
    const privateOther = await datasetFactory.create({
      user_id: otherUser.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const result = await repository.findManyPublicOrUserPrivate({
      user_id: user.id,
    });

    const ids = result.map(dataset => dataset.id);

    expect(ids).toEqual(
      expect.arrayContaining([publicOther.id, privateOwned.id]),
    );
    expect(ids).not.toContain(privateOther.id);
  });

  it("should count datasets by filter", async () => {
    await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });
    await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const count = await repository.getCount({ user_id: user.id });

    expect(count).toBe(2);
  });

  it("should count public datasets and own private datasets", async () => {
    const otherUser = await userFactory.create();

    await datasetFactory.create({
      user_id: otherUser.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });
    await datasetFactory.create({
      user_id: otherUser.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const count = await repository.getCountPublicOrUserPrivate({
      user_id: user.id,
    });

    expect(count).toBe(2);
  });

  it("should update one dataset", async () => {
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const updated = await repository.updateOne(
      { id: dataset.id },
      { description: "Updated", tags: "a,b" },
    );

    expect(updated).toMatchObject({
      id: dataset.id,
      description: "Updated",
      tags: "a,b",
    });

    const found = await repository.findOne({ id: dataset.id });
    expect(found?.description).toBe("Updated");
  });

  it("should return null updating a dataset that does not exist", async () => {
    const updated = await repository.updateOne(
      { id: faker.string.uuid() },
      { description: "Updated" },
    );

    expect(updated).toBeNull();
  });

  it("should delete one dataset", async () => {
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const deleted = await repository.deleteOne({ id: dataset.id });

    expect(deleted?.id).toBe(dataset.id);

    const found = await repository.findOne({ id: dataset.id });
    expect(found).toBeNull();
  });

  it("should return null deleting a dataset that does not exist", async () => {
    const deleted = await repository.deleteOne({ id: faker.string.uuid() });

    expect(deleted).toBeNull();
  });
});

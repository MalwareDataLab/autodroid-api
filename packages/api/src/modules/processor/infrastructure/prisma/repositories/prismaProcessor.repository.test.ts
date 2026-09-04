import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Repository import
import { IProcessorRepository } from "@shared/container/repositories";

// Enum import
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

const makeConfiguration = () => ({
  parameters: [],
  dataset_input_argument: "",
  dataset_input_value: "",
  dataset_output_argument: "",
  dataset_output_value: "",
  command: "",
  output_metrics_file_glob_patterns: ["*"],
  output_result_file_glob_patterns: ["*"],
});

describe("Repository: PrismaProcessorRepository", () => {
  let repository: IProcessorRepository;
  let user: User;

  beforeEach(async () => {
    repository = container.resolve("ProcessorRepository");
    user = await userFactory.create();
  });

  it("should create and find one processor", async () => {
    const created = await repository.createOne({
      name: faker.system.fileName(),
      description: faker.word.words(3),
      tags: "one,two,three",
      allowed_mime_types: "image/png",
      image_tag: faker.system.fileName(),
      version: faker.system.semver(),
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      payload: {},
      configuration: makeConfiguration(),
      user_id: user.id,
    });

    const found = await repository.findOne({ id: created.id });

    expect(found?.id).toBe(created.id);
    expect(found?.user_id).toBe(user.id);
  });

  it("should return null finding a processor that does not exist", async () => {
    const found = await repository.findOne({ id: faker.string.uuid() });

    expect(found).toBeNull();
  });

  it("should find many processors filtered by user_id with pagination and sorting", async () => {
    const owned = await processorFactory.create({
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
    });
    const otherUser = await userFactory.create();
    await processorFactory.create({
      user_id: otherUser.id,
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
    });

    const result = await repository.findMany(
      { user_id: user.id },
      { skip: 0, take: 10 },
      [{ field: "created_at", order: SORT_ORDER.ASC }],
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(owned.id);
  });

  it("should find many processors filtered by visibility, name, version and image_tag", async () => {
    const processor = await processorFactory.create({
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    const result = await repository.findMany({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      name: processor.name,
      version: processor.version,
      image_tag: processor.image_tag,
    });

    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: processor.id })]),
    );
  });

  it("should find public processors and own hidden processors, excluding others hidden", async () => {
    const otherUser = await userFactory.create();

    const publicOther = await processorFactory.create({
      user_id: otherUser.id,
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const hiddenOwned = await processorFactory.create({
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
    });
    const hiddenOther = await processorFactory.create({
      user_id: otherUser.id,
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
    });

    const result = await repository.findManyPublicOrUserPrivate({
      user_id: user.id,
    });

    const ids = result.map(processor => processor.id);

    expect(ids).toEqual(
      expect.arrayContaining([publicOther.id, hiddenOwned.id]),
    );
    expect(ids).not.toContain(hiddenOther.id);
  });

  it("should find public or user private processors with pagination and sorting", async () => {
    const processor = await processorFactory.create({
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    const result = await repository.findManyPublicOrUserPrivate(
      { user_id: user.id },
      { skip: 0, take: 10 },
      [{ field: "created_at", order: SORT_ORDER.DESC }],
    );

    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: processor.id })]),
    );
  });

  it("should get the allowed mime types of all processors", async () => {
    await processorFactory.create({
      user_id: user.id,
      allowed_mime_types: "image/png,text/csv",
    });

    const result = await repository.getAllowedMimeTypes();

    expect(result).toEqual(expect.arrayContaining(["image/png", "text/csv"]));
  });

  it("should count processors by filter", async () => {
    await processorFactory.create({
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
    });
    await processorFactory.create({
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
    });

    const count = await repository.getCount({ user_id: user.id });

    expect(count).toBe(2);
  });

  it("should count public processors and own hidden processors", async () => {
    const otherUser = await userFactory.create();

    await processorFactory.create({
      user_id: otherUser.id,
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    await processorFactory.create({
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
    });
    await processorFactory.create({
      user_id: otherUser.id,
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
    });

    const count = await repository.getCountPublicOrUserPrivate({
      user_id: user.id,
    });

    expect(count).toBe(2);
  });

  it("should update one processor", async () => {
    const processor = await processorFactory.create({ user_id: user.id });

    const updated = await repository.updateOne(
      { id: processor.id },
      { description: "Updated", tags: "a,b" },
    );

    expect(updated).toMatchObject({
      id: processor.id,
      description: "Updated",
      tags: "a,b",
    });
  });

  it("should return null updating a processor that does not exist", async () => {
    const updated = await repository.updateOne(
      { id: faker.string.uuid() },
      { description: "Updated" },
    );

    expect(updated).toBeNull();
  });

  it("should delete one processor", async () => {
    const processor = await processorFactory.create({ user_id: user.id });

    const deleted = await repository.deleteOne({ id: processor.id });

    expect(deleted?.id).toBe(processor.id);

    const found = await repository.findOne({ id: processor.id });
    expect(found).toBeNull();
  });

  it("should return null deleting a processor that does not exist", async () => {
    const deleted = await repository.deleteOne({ id: faker.string.uuid() });

    expect(deleted).toBeNull();
  });
});

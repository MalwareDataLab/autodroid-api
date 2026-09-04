import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

// Decorator import
import { IsUUIDArray } from "./isUUIDArray.decorator";

const buildClass = (apply: (target: object, key: string) => void) => {
  class Target {
    value: unknown;
  }
  apply(Target.prototype, "value");
  return Target;
};

const constraintKeys = async (Target: any, value: unknown) => {
  const errors = await validate(plainToInstance(Target, { value }));
  return errors.flatMap(error => Object.keys(error.constraints ?? {}));
};

describe("Decorator: IsUUIDArray", () => {
  it("should accept a non-empty unique array of uuids by default", async () => {
    const Target = buildClass(IsUUIDArray());

    expect(
      await constraintKeys(Target, [faker.string.uuid(), faker.string.uuid()]),
    ).toHaveLength(0);
  });

  it("should reject an empty array", async () => {
    const Target = buildClass(IsUUIDArray());

    const keys = await constraintKeys(Target, []);
    expect(keys).toContain("arrayNotEmpty");
    expect(keys).toContain("arrayMinSize");
  });

  it("should reject an array with duplicated values", async () => {
    const Target = buildClass(IsUUIDArray());
    const uuid = faker.string.uuid();

    expect(await constraintKeys(Target, [uuid, uuid])).toContain("arrayUnique");
  });

  it("should reject an array bigger than the maximum size", async () => {
    const Target = buildClass(IsUUIDArray());
    const values = Array.from({ length: 101 }, () => faker.string.uuid());

    expect(await constraintKeys(Target, values)).toContain("arrayMaxSize");
  });

  it("should reject an array with invalid uuids", async () => {
    const Target = buildClass(IsUUIDArray());

    expect(await constraintKeys(Target, ["not-a-uuid"])).toContain("isUuid");
  });

  it("should validate mongo ids when the mode is mongo", async () => {
    const Target = buildClass(IsUUIDArray({ mode: "mongo" }));

    expect(
      await constraintKeys(Target, [faker.database.mongodbObjectId()]),
    ).toHaveLength(0);
    expect(await constraintKeys(Target, ["not-a-mongo-id"])).toContain(
      "isMongoId",
    );
  });
});

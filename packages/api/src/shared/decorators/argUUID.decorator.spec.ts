import { faker } from "@faker-js/faker";
import { ParameterDecorator } from "type-graphql";
import { describe, expect, it } from "vitest";

// Error import
import { ValidationError } from "@shared/errors/ValidationError";

// Target import
import { ArgUUID } from "./argUUID.decorator";

const applyAndGetParam = (
  decorator: ParameterDecorator,
  target: object,
  methodName: string,
) => {
  decorator(target, methodName, 0);
  const storage = (global as any).TypeGraphQLMetadataStorage;
  return storage.params
    .filter(
      (entry: any) =>
        entry.target === (target as any).constructor &&
        entry.methodName === methodName,
    )
    .pop();
};

describe("Decorator: ArgUUID", () => {
  it("should validate a valid uuid and resolve the argument type", () => {
    class Resolver {
      handler(id: string) {
        return id;
      }
    }
    const param = applyAndGetParam(
      ArgUUID("id"),
      Resolver.prototype,
      "handler",
    );

    expect(param.getType()).toBe(String);
    expect(() => param.validateFn(faker.string.uuid())).not.toThrow();
  });

  it("should describe the argument with the given description", () => {
    class Resolver {
      handler(id: string) {
        return id;
      }
    }
    const param = applyAndGetParam(
      ArgUUID("id", { description: "The id." }),
      Resolver.prototype,
      "handler",
    );

    expect(param.description).toBe("The id.");
  });

  it("should throw a ValidationError for an invalid uuid", () => {
    class Resolver {
      handler(id: string) {
        return id;
      }
    }
    const param = applyAndGetParam(
      ArgUUID("id"),
      Resolver.prototype,
      "handler",
    );

    expect(() => param.validateFn("not-a-valid-uuid")).toThrowError(
      ValidationError,
    );
  });

  it("should accept nullable options and validate a valid uuid", () => {
    class Resolver {
      handler(id: string) {
        return id;
      }
    }
    const param = applyAndGetParam(
      ArgUUID("id", { nullable: true }),
      Resolver.prototype,
      "handler",
    );

    expect(() => param.validateFn(faker.string.uuid())).not.toThrow();
  });
});

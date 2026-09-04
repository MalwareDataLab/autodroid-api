import { describe, expect, it } from "vitest";
import { validate } from "class-validator";
import { ClassConstructor, plainToInstance } from "class-transformer";

// Decorator import
import { ValidString } from "./validString.decorator";

const buildClass = (apply: (target: object, key: string) => void) => {
  class Target {
    value: unknown;
  }
  apply(Target.prototype, "value");
  return Target;
};

const validateValue = async (
  Target: ClassConstructor<{ value: unknown }>,
  value: unknown,
) => {
  const instance = plainToInstance(Target, { value });
  const errors = await validate(instance);
  return {
    keys: errors.flatMap(error => Object.keys(error.constraints ?? {})),
    instance,
  };
};

describe("Decorator: ValidString", () => {
  it("should require a non-empty string by default", async () => {
    const Target = buildClass(ValidString());

    expect((await validateValue(Target, "value")).keys).toHaveLength(0);
    expect((await validateValue(Target, "")).keys).toContain("minLength");
    expect((await validateValue(Target, undefined)).keys).toContain("isString");
  });

  it("should apply the nullable validation when nullable is provided", async () => {
    const Target = buildClass(ValidString({ nullable: true }));

    expect((await validateValue(Target, undefined)).keys).toHaveLength(0);
    expect((await validateValue(Target, "value")).keys).toHaveLength(0);
  });

  it("should trim the string value through the transform", async () => {
    const Target = buildClass(ValidString());

    const { instance } = await validateValue(Target, "  hello   world  ");
    expect((instance as { value: string }).value).toBe("hello world");
  });
});

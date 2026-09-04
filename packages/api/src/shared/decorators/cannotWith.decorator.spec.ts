import { describe, expect, it } from "vitest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

// Decorator import
import { CannotWith } from "./cannotWith.decorator";

const buildClass = () => {
  class Target {
    value: unknown;

    other: unknown;
  }
  CannotWith(["other"])(Target.prototype, "value");
  return Target;
};

const validatePlain = async (Target: any, plain: object) =>
  validate(plainToInstance(Target, plain));

describe("Decorator: CannotWith", () => {
  it("should pass when the conflicting property is absent", async () => {
    const Target = buildClass();

    expect(await validatePlain(Target, { value: "a" })).toHaveLength(0);
  });

  it("should fail when the conflicting property is present", async () => {
    const Target = buildClass();

    const errors = await validatePlain(Target, { value: "a", other: "b" });
    const messages = errors.flatMap(error =>
      Object.values(error.constraints ?? {}),
    );
    expect(errors).not.toHaveLength(0);
    expect(messages).toContain("value cannot be used with other");
  });
});

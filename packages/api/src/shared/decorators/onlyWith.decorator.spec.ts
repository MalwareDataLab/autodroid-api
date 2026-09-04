import { describe, expect, it } from "vitest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

// Decorator import
import { OnlyWith } from "./onlyWith.decorator";

const buildClass = () => {
  class Target {
    value: unknown;

    other: unknown;
  }
  OnlyWith(["other"])(Target.prototype, "value");
  return Target;
};

const validatePlain = async (Target: any, plain: object) =>
  validate(plainToInstance(Target, plain));

describe("Decorator: OnlyWith", () => {
  it("should pass when the required property is present", async () => {
    const Target = buildClass();

    expect(
      await validatePlain(Target, { value: "a", other: "b" }),
    ).toHaveLength(0);
  });

  it("should fail when the required property is absent", async () => {
    const Target = buildClass();

    const errors = await validatePlain(Target, { value: "a" });
    const messages = errors.flatMap(error =>
      Object.values(error.constraints ?? {}),
    );
    expect(errors).not.toHaveLength(0);
    expect(messages).toContain("value needs to be used with other");
  });
});

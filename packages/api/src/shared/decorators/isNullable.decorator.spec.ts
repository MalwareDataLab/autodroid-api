import { describe, expect, it } from "vitest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

// Decorator import
import { IsNullable, NullableOptions } from "./isNullable.decorator";

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

describe("Decorator: IsNullable", () => {
  it("should apply the optional validation when nullable is true", async () => {
    const Target = buildClass(IsNullable({ nullable: true }));

    expect(await constraintKeys(Target, undefined)).toHaveLength(0);
    expect(await constraintKeys(Target, "value")).toHaveLength(0);
  });

  it("should use nullable true as the default option", async () => {
    const Target = buildClass(IsNullable());

    expect(await constraintKeys(Target, undefined)).toHaveLength(0);
  });

  it("should allow null but reject undefined when nullable is allowNull", async () => {
    const Target = buildClass(IsNullable({ nullable: "allowNull" }));

    expect(await constraintKeys(Target, null)).toHaveLength(0);
    expect(await constraintKeys(Target, undefined)).toContain("notEquals");
  });

  it("should allow undefined but reject null when nullable is allowUndefined", async () => {
    const Target = buildClass(IsNullable({ nullable: "allowUndefined" }));

    expect(await constraintKeys(Target, undefined)).toHaveLength(0);
    expect(await constraintKeys(Target, null)).toContain("notEquals");
  });

  it("should require the value when nullable is false", async () => {
    const Target = buildClass(IsNullable({ nullable: false }));

    expect(await constraintKeys(Target, "")).toContain("isNotEmpty");
    expect(await constraintKeys(Target, "value")).toHaveLength(0);
  });

  it("should accept the nullable option typed as NullableOptions", async () => {
    const nullable: NullableOptions = true;
    const Target = buildClass(IsNullable({ nullable }));

    expect(await constraintKeys(Target, undefined)).toHaveLength(0);
  });
});

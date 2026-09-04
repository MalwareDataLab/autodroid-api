import { describe, expect, it } from "vitest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

// Decorator import
import { NameString } from "./nameString.decorator";

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

describe("Decorator: NameString", () => {
  it("should accept a name with only letters and spaces by default", async () => {
    const Target = buildClass(NameString());

    expect(await constraintKeys(Target, "John Doe")).toHaveLength(0);
  });

  it("should reject a name containing invalid characters", async () => {
    const Target = buildClass(NameString());

    expect(await constraintKeys(Target, "John3")).toContain("matches");
  });

  it("should apply the nullable validation when nullable is true", async () => {
    const Target = buildClass(NameString({ nullable: true }));

    expect(await constraintKeys(Target, undefined)).toHaveLength(0);
  });
});

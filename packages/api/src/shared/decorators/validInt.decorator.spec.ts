import { describe, expect, it } from "vitest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

// Constant import
import {
  MAX_SAFE_INT,
  MIN_SAFE_INT,
} from "@shared/constants/maxSafeInt.constant";

// Decorator import
import { ValidInt } from "./validInt.decorator";

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

describe("Decorator: ValidInt", () => {
  it("should require an integer within the safe range by default", async () => {
    const Target = buildClass(ValidInt());

    expect(await constraintKeys(Target, 10)).toHaveLength(0);
    expect(await constraintKeys(Target, 1.5)).toContain("isInt");
    expect(await constraintKeys(Target, MIN_SAFE_INT - 1)).toContain("min");
    expect(await constraintKeys(Target, MAX_SAFE_INT + 1)).toContain("max");
  });

  it("should apply the nullable validation when nullable is provided", async () => {
    const Target = buildClass(ValidInt({ nullable: true }));

    expect(await constraintKeys(Target, undefined)).toHaveLength(0);
    expect(await constraintKeys(Target, 10)).toHaveLength(0);
  });
});

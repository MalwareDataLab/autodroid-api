import { plainToInstance } from "class-transformer";
import { describe, expect, it } from "vitest";

// Target import
import { BooleanStringTransform } from "./booleanStringTransform.decorator";

const buildClass = (apply: (target: object, key: string) => void) => {
  class Target {
    value: unknown;
  }
  apply(Target.prototype, "value");
  return Target;
};

const transformValue = (Target: any, value: unknown) =>
  (plainToInstance(Target, { value }) as { value: unknown }).value;

describe("Decorator: BooleanStringTransform", () => {
  it("should read the query string true as the boolean true", () => {
    const Target = buildClass(BooleanStringTransform());

    expect(transformValue(Target, "true")).toBe(true);
  });

  it("should read the query string false as the boolean false", () => {
    const Target = buildClass(BooleanStringTransform());

    expect(transformValue(Target, "false")).toBe(false);
  });

  it("should leave any other value for the validation to judge", () => {
    const Target = buildClass(BooleanStringTransform());

    expect(transformValue(Target, "yes")).toBe("yes");
    expect(transformValue(Target, "")).toBe("");
    expect(transformValue(Target, true)).toBe(true);
    expect(transformValue(Target, false)).toBe(false);
    expect(transformValue(Target, undefined)).toBeUndefined();
  });
});

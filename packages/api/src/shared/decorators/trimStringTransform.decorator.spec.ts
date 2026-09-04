import { describe, expect, it } from "vitest";
import { plainToInstance } from "class-transformer";

// Decorator import
import { TrimStringTransform } from "./trimStringTransform.decorator";

const buildClass = (apply: (target: object, key: string) => void) => {
  class Target {
    value: unknown;
  }
  apply(Target.prototype, "value");
  return Target;
};

const transformValue = (Target: any, value: unknown) =>
  (plainToInstance(Target, { value }) as { value: unknown }).value;

describe("Decorator: TrimStringTransform", () => {
  it("should trim and collapse whitespace of a truthy string", () => {
    const Target = buildClass(TrimStringTransform());

    expect(transformValue(Target, "  hello   world  ")).toBe("hello world");
  });

  it("should return the value unchanged when it is falsy", () => {
    const Target = buildClass(TrimStringTransform());

    expect(transformValue(Target, "")).toBe("");
    expect(transformValue(Target, undefined)).toBeUndefined();
  });
});

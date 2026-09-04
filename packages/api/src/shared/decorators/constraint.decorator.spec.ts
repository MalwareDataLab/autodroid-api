import { describe, expect, it } from "vitest";

// Decorator import
import { Constraint } from "./constraint.decorator";

const findFieldDirective = (target: object, fieldName: string) => {
  const storage = (global as any).TypeGraphQLMetadataStorage;
  return storage.fieldDirectives
    .filter(
      (directive: any) =>
        directive.target === target && directive.fieldName === fieldName,
    )
    .pop();
};

describe("Decorator: Constraint", () => {
  it("should register a directive for a string format value", () => {
    class Target {
      value!: string;
    }
    Constraint("format", "cuid")(Target.prototype, "value");

    const directive = findFieldDirective(Target, "value");
    expect(directive.directive.nameOrDefinition).toBe(
      "@constraint(format: cuid)",
    );
  });

  it("should register a directive for a numeric value", () => {
    class Target {
      value!: string;
    }
    Constraint("minLength", 3)(Target.prototype, "value");

    const directive = findFieldDirective(Target, "value");
    expect(directive.directive.nameOrDefinition).toBe(
      "@constraint(minLength: 3)",
    );
  });
});

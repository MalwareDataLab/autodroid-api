import { describe, expect, it } from "vitest";

// Error import
import { ValidationError } from "@shared/errors/ValidationError";

// Test target import
import { validateNullable } from ".";

describe("Utils: validateNullable", () => {
  it("should not throw when the value is present", () => {
    expect(() =>
      validateNullable({ key: "name", value: "value", nullable: false }),
    ).not.toThrow();
  });

  it("should not throw when nullable is true", () => {
    expect(() =>
      validateNullable({ key: "name", value: "", nullable: true }),
    ).not.toThrow();
  });

  it("should not throw when nullable allows null and the value is null", () => {
    expect(() =>
      validateNullable({
        key: "name",
        value: null as unknown as string,
        nullable: "allowNull",
      }),
    ).not.toThrow();
  });

  it("should not throw when nullable allows undefined and the value is undefined", () => {
    expect(() =>
      validateNullable({
        key: "name",
        value: undefined as unknown as string,
        nullable: "allowUndefined",
      }),
    ).not.toThrow();
  });

  it("should throw a ValidationError when the value is required and missing", () => {
    expect(() =>
      validateNullable({ key: "name", value: "", nullable: false }),
    ).toThrowError(ValidationError);
  });
});

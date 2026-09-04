import { describe, expect, it } from "vitest";

// Error import
import { ValidationError } from "./ValidationError";

describe("Error: ValidationError", () => {
  it("should build a validation error with the given message", () => {
    const error = new ValidationError("name is required");

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ValidationError");
    expect(error.message).toBe("name is required");
  });
});

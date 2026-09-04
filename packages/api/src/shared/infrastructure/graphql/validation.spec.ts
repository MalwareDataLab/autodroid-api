import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { ArgumentValidationError } from "type-graphql";

// Handler import

// Library import
import { validateOrReject } from "class-validator";
import { instanceToInstance } from "class-transformer";
import { validationHandler } from "./validation";

vi.mock("class-validator", () => ({
  validateOrReject: vi.fn(),
}));
vi.mock("class-transformer", () => ({
  instanceToInstance: vi.fn(value => value),
}));

describe("GraphQL: validationHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateOrReject as Mock).mockResolvedValue(undefined);
  });

  it("should return the value untouched when it is nullish", async () => {
    const result = await validationHandler(undefined, null);

    expect(result).toBeUndefined();
    expect(validateOrReject).not.toHaveBeenCalled();
  });

  it("should return the value untouched when it is not an object", async () => {
    const result = await validationHandler("plain" as any, null);

    expect(result).toBe("plain");
    expect(validateOrReject).not.toHaveBeenCalled();
  });

  it("should validate and re-instance a single object argument", async () => {
    const argValue = { field: "value" };

    const result = await validationHandler(argValue, null);

    expect(validateOrReject).toHaveBeenCalledWith(argValue, {});
    expect(instanceToInstance).toHaveBeenCalledWith(argValue);
    expect(result).toBe(argValue);
  });

  it("should validate every item of an array argument", async () => {
    const argValue = [{ a: 1 }, { b: 2 }];

    const result = await validationHandler(argValue, null);

    expect(validateOrReject).toHaveBeenCalledTimes(2);
    expect(result).toBe(argValue);
  });

  it("should wrap a validation failure into an ArgumentValidationError", async () => {
    (validateOrReject as Mock).mockRejectedValueOnce([{ constraints: {} }]);

    await expect(validationHandler({ field: "value" }, null)).rejects.toThrow(
      ArgumentValidationError,
    );
  });
});

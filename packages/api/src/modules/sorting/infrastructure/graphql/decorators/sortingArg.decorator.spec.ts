import { describe, expect, it, vi } from "vitest";

// Decorator import
import { SortingArg } from "./sortingArg.decorator";

const h = vi.hoisted(() => ({
  arg: vi.fn(() => vi.fn()),
}));

vi.mock("type-graphql", async importOriginal => ({
  ...(await importOriginal<typeof import("type-graphql")>()),
  Arg: h.arg,
}));

describe("Decorator: SortingArg", () => {
  const applyDecorator = (
    fields: ReadonlyArray<string>,
    options?: { nullable?: boolean },
  ) => {
    h.arg.mockClear();

    SortingArg<Record<string, unknown>>(fields, options)({}, "userDatasets", 0);

    const [name, , argOptions] = h.arg.mock.calls[0] as unknown as [
      string,
      () => unknown,
      { nullable: boolean; validateFn: (value?: any) => void },
    ];

    return { name, argOptions };
  };

  it("should register a nullable sorting argument by default", () => {
    const { name, argOptions } = applyDecorator(["created_at"]);

    expect(name).toBe("sorting");
    expect(argOptions.nullable).toBe(true);
  });

  it("should forward an explicit non-nullable option", () => {
    const { argOptions } = applyDecorator(["created_at"], { nullable: false });

    expect(argOptions.nullable).toBe(false);
  });

  it("should accept a sorting value restricted to the declared fields", () => {
    const { argOptions } = applyDecorator(["created_at", "updated_at"]);

    expect(() =>
      argOptions.validateFn([{ field: "created_at", order: "asc" }]),
    ).not.toThrow();
  });

  it("should reject a sorting value outside the declared fields", () => {
    const { argOptions } = applyDecorator(["created_at"]);

    expect(() =>
      argOptions.validateFn([{ field: "not_a_field", order: "asc" }]),
    ).toThrowError(
      "Invalid sorting fields: not_a_field. Valid fields are: created_at.",
    );
  });

  it("should reject a sorting order outside the supported orders", () => {
    const { argOptions } = applyDecorator(["created_at"]);

    expect(() =>
      argOptions.validateFn([{ field: "created_at", order: "SIDEWAYS" }]),
    ).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining("Invalid sorting orders"),
      }),
    );
  });
});

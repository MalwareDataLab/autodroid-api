import { describe, expect, it } from "vitest";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Error import
import { AppError } from "@shared/errors/AppError";

// Test target import
import { makeSortingObj } from ".";

const options = ["name", "created_at", "id"] as const;

describe("Utils: makeSortingObj", () => {
  it("should build the sorting object from the provided sorting merged with the default common", () => {
    const result = makeSortingObj({
      options,
      sorting: [{ field: "name", order: SORT_ORDER.ASC }],
    });

    expect(result).toEqual({
      name: "asc",
      created_at: "desc",
      id: "desc",
    });
  });

  it("should use the fallback when sorting is not provided", () => {
    const result = makeSortingObj({
      options,
      fallback: { created_at: "desc" },
      common: {},
    });

    expect(result).toEqual({ created_at: "desc" });
  });

  it("should default to an empty object when neither sorting nor fallback are provided", () => {
    const result = makeSortingObj({
      options,
      common: {},
    });

    expect(result).toEqual({});
  });

  it("should default the options when they are not provided", () => {
    const result = makeSortingObj({
      sorting: [{ field: "created_at", order: SORT_ORDER.DESC }],
      common: {},
    } as Parameters<typeof makeSortingObj>[0]);

    expect(result).toEqual({ created_at: "desc" });
  });

  it("should throw when a sorting field is invalid", () => {
    expect(() =>
      makeSortingObj({
        options: ["name"] as const,
        sorting: [{ field: "invalid" as "name", order: SORT_ORDER.ASC }],
        common: {},
      }),
    ).toThrowError(expect.objectContaining({ key: "@sorting/INVALID_FIELD" }));

    expect(() =>
      makeSortingObj({
        options: ["name"] as const,
        sorting: [{ field: "invalid" as "name", order: SORT_ORDER.ASC }],
        common: {},
      }),
    ).toThrowError(AppError);
  });

  it("should apply the overrides when the sorting includes the overridden field", () => {
    const result = makeSortingObj({
      options,
      sorting: [{ field: "name", order: SORT_ORDER.ASC }],
      overrides: { name: { created_at: "desc" } },
      common: {},
    });

    expect(result).toMatchObject({ created_at: "desc" });
    expect(result.name).toBeUndefined();
  });

  it("should ignore the overrides when the sorting does not include the overridden field", () => {
    const result = makeSortingObj({
      options,
      sorting: [{ field: "name", order: SORT_ORDER.ASC }],
      overrides: { id: { id: "asc" } },
      common: {},
    });

    expect(result).toEqual({ name: "asc" });
  });
});

import { describe, expect, it } from "vitest";
import { GraphQLError } from "graphql";
import { ApolloServerErrorCode } from "@apollo/server/errors";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Test target import
import { validateSorting } from "./validateSorting.util";

const allowed = ["name", "created_at", "id"] as const;

const validationFailed = expect.objectContaining({
  extensions: expect.objectContaining({
    code: ApolloServerErrorCode.GRAPHQL_VALIDATION_FAILED,
  }),
});

describe("Utils: validateSorting", () => {
  it("should skip validation when nullable and no value is provided", () => {
    expect(() =>
      validateSorting<Record<string, unknown>>({
        value: undefined,
        allowed,
        nullable: { nullable: true },
      }),
    ).not.toThrow();
  });

  it("should throw when the value is not provided", () => {
    expect(() =>
      validateSorting<Record<string, unknown>>({
        value: undefined,
        allowed,
        nullable: undefined as unknown as { nullable?: boolean },
      }),
    ).toThrowError(validationFailed);
  });

  it("should throw when more than the maximum sorting fields are provided", () => {
    expect(() =>
      validateSorting<Record<string, unknown>>({
        value: [
          { field: "name", order: SORT_ORDER.ASC },
          { field: "created_at", order: SORT_ORDER.ASC },
          { field: "id", order: SORT_ORDER.ASC },
          { field: "name", order: SORT_ORDER.DESC },
        ],
        allowed,
        nullable: {},
      }),
    ).toThrowError(validationFailed);
  });

  it("should throw when there are duplicated sorting fields", () => {
    expect(() =>
      validateSorting<Record<string, unknown>>({
        value: [
          { field: "name", order: SORT_ORDER.ASC },
          { field: "name", order: SORT_ORDER.DESC },
        ],
        allowed,
        nullable: {},
      }),
    ).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining("Duplicated sorting fields"),
        extensions: expect.objectContaining({
          code: ApolloServerErrorCode.GRAPHQL_VALIDATION_FAILED,
        }),
      }),
    );
  });

  it("should throw when there are invalid sorting fields", () => {
    expect(() =>
      validateSorting<Record<string, unknown>>({
        value: [{ field: "unknown", order: SORT_ORDER.ASC }],
        allowed,
        nullable: {},
      }),
    ).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining("Invalid sorting fields"),
        extensions: expect.objectContaining({
          code: ApolloServerErrorCode.GRAPHQL_VALIDATION_FAILED,
        }),
      }),
    );
  });

  it("should throw when there are invalid sorting orders", () => {
    expect(() =>
      validateSorting<Record<string, unknown>>({
        value: [{ field: "name", order: "sideways" }],
        allowed,
        nullable: {},
      }),
    ).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining("Invalid sorting orders"),
        extensions: expect.objectContaining({
          code: ApolloServerErrorCode.GRAPHQL_VALIDATION_FAILED,
        }),
      }),
    );
  });

  it("should not throw when the sorting is valid", () => {
    expect(
      validateSorting<Record<string, unknown>>({
        value: [{ field: "name", order: SORT_ORDER.ASC }],
        allowed,
        nullable: {},
      }),
    ).toBeUndefined();
  });

  it("should be a GraphQLError instance when it throws", () => {
    let thrown: unknown;
    try {
      validateSorting<Record<string, unknown>>({
        value: [],
        allowed,
        nullable: {},
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(GraphQLError);
  });
});

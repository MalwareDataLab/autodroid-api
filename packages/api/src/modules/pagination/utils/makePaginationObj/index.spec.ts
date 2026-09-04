import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";

// Type import
import { Cursor } from "@modules/pagination/types/IPagination.type";

// Test target import
import { makePaginationObj } from ".";

const makeCursor = (): Cursor => ({
  created_at: faker.date.recent(),
  id: faker.string.uuid(),
});

describe("Utils: makePaginationObj", () => {
  it("should return the default pagination when no schema is provided", () => {
    expect(makePaginationObj()).toEqual({
      cursor: undefined,
      skip: 0,
      take: undefined,
    });
  });

  it("should return the default pagination when every strategy field is empty", () => {
    expect(makePaginationObj({})).toEqual({
      cursor: undefined,
      skip: 0,
      take: undefined,
    });
  });

  it("should throw when pagination strategies are mixed", () => {
    expect(() =>
      makePaginationObj({
        before: makeCursor(),
        last: 5,
        after: makeCursor(),
        first: 5,
        skip: 1,
        take: 1,
      }),
    ).toThrowError("Cannot mix pagination strategies.");
  });

  it("should throw when the before cursor is not valid", () => {
    expect(() =>
      makePaginationObj({
        before: {} as Cursor,
        last: 5,
      }),
    ).toThrowError("Cursor is not valid.");
  });

  it("should throw when before is used without last", () => {
    expect(() =>
      makePaginationObj({
        before: makeCursor(),
      }),
    ).toThrowError("Cannot use before without last.");
  });

  it("should throw when before is used with a non-number last", () => {
    expect(() =>
      makePaginationObj({
        before: makeCursor(),
        last: "5" as unknown as number,
      }),
    ).toThrowError("Cannot use before without last.");
  });

  it("should throw when before is used with last lower than one", () => {
    expect(() =>
      makePaginationObj({
        before: makeCursor(),
        last: 0.5,
      }),
    ).toThrowError("Cannot use before without last.");
  });

  it("should return the before pagination", () => {
    const before = makeCursor();

    expect(makePaginationObj({ before, last: 5 })).toEqual({
      cursor: before,
      skip: 0,
      take: -7,
    });
  });

  it("should return the before pagination when after fields are present without skip or take", () => {
    const before = makeCursor();

    expect(
      makePaginationObj({
        before,
        last: 5,
        after: makeCursor(),
        first: 5,
      }),
    ).toEqual({
      cursor: before,
      skip: 0,
      take: -7,
    });
  });

  it("should throw when the after cursor is not valid", () => {
    expect(() =>
      makePaginationObj({
        after: {} as Cursor,
        first: 5,
      }),
    ).toThrowError("Cursor is not valid.");
  });

  it("should throw when after is used without first", () => {
    expect(() =>
      makePaginationObj({
        after: makeCursor(),
      }),
    ).toThrowError("Cannot use after without first.");
  });

  it("should throw when after is used with a non-number first", () => {
    expect(() =>
      makePaginationObj({
        after: makeCursor(),
        first: "5" as unknown as number,
      }),
    ).toThrowError("Cannot use after without first.");
  });

  it("should throw when after is used with first lower than one", () => {
    expect(() =>
      makePaginationObj({
        after: makeCursor(),
        first: 0.5,
      }),
    ).toThrowError("Cannot use after without first.");
  });

  it("should return the after pagination", () => {
    const after = makeCursor();

    expect(makePaginationObj({ after, first: 3 })).toEqual({
      cursor: after,
      skip: 0,
      take: 5,
    });
  });

  it("should throw when skip is negative", () => {
    expect(() =>
      makePaginationObj({
        skip: -1,
      }),
    ).toThrowError("Cannot use negative numbers for skip.");
  });

  it("should throw when take is provided but not a number", () => {
    expect(() =>
      makePaginationObj({
        skip: 0,
        take: "10" as unknown as number,
      }),
    ).toThrowError("Take should be a number");
  });

  it("should return the skip and take pagination", () => {
    expect(makePaginationObj({ skip: 2, take: 10 })).toEqual({
      cursor: undefined,
      skip: 2,
      take: 10,
    });
  });

  it("should return the skip pagination when take is undefined", () => {
    expect(makePaginationObj({ skip: 5 })).toEqual({
      cursor: undefined,
      skip: 5,
      take: undefined,
    });
  });

  it("should throw when the strategy cannot be resolved", () => {
    expect(() =>
      makePaginationObj({
        take: 10,
      } as IPaginationDTO),
    ).toThrowError("Invalid pagination strategy.");
  });
});

import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

// Constant import
import {
  TAKE_DEFAULT,
  TAKE_LIMIT,
} from "@modules/pagination/constants/paginationLimit.constant";

// Type import
import { Cursor } from "@modules/pagination/types/IPagination.type";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";

// Target import
import { makePaginationObj } from ".";

const makeCursor = (): Cursor => ({
  created_at: faker.date.recent(),
  id: faker.string.uuid(),
});

describe("Utils: makePaginationObj", () => {
  it("should return an unbounded pagination when no schema is provided", () => {
    expect(makePaginationObj()).toEqual({
      cursor: undefined,
      skip: 0,
      take: undefined,
    });
  });

  it("should return the first default-sized page when every strategy field is empty", () => {
    expect(makePaginationObj({})).toEqual({
      cursor: undefined,
      skip: 0,
      take: TAKE_DEFAULT,
    });
  });

  it("should return the first default-sized page when every strategy field is null", () => {
    expect(
      makePaginationObj({
        before: null,
        last: null,
        after: null,
        first: null,
        skip: null,
        take: null,
      }),
    ).toEqual({
      cursor: undefined,
      skip: 0,
      take: TAKE_DEFAULT,
    });
  });

  it.each([
    [
      "mixed strategies",
      {
        before: makeCursor(),
        last: 5,
        after: makeCursor(),
        first: 5,
        skip: 0,
        take: 5,
      },
    ],
    ["a cursor that is not one", { after: { id: "x" } as never, first: 5 }],
    ["a negative skip", { skip: -1, take: 5 }],
    ["a cursor without its size", { before: makeCursor() }],
    ["a cursor without its size going forward", { after: makeCursor() }],
    ["a before cursor that is not one", { before: {} as never, last: 5 }],
    ["a take that is not a number", { skip: 0, take: "10" as never }],
    ["no resolvable strategy", { take: 10 }],
  ])(
    "should refuse %s as a bad request, not a server failure",
    (_label, request) => {
      let failure: unknown;
      try {
        makePaginationObj(request as IPaginationDTO);
      } catch (error) {
        failure = error;
      }

      expect(failure).toMatchObject({
        key: "@pagination/INVALID_PAGINATION",
        statusCode: 400,
      });
    },
  );

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

  it("should return a default-sized page from skip when take is undefined", () => {
    expect(makePaginationObj({ skip: 5 })).toEqual({
      cursor: undefined,
      skip: 5,
      take: TAKE_DEFAULT,
    });
  });

  it("should return a default-sized page from skip when take is null", () => {
    expect(makePaginationObj({ skip: 5, take: null })).toEqual({
      cursor: undefined,
      skip: 5,
      take: TAKE_DEFAULT,
    });
  });

  it("should give a bounded first page to a request that only says it starts at zero", () => {
    expect(makePaginationObj({ skip: 0 })).toEqual({
      cursor: undefined,
      skip: 0,
      take: TAKE_DEFAULT,
    });
  });

  it("should pass the largest size a request may ask for through untouched", () => {
    expect(makePaginationObj({ skip: 0, take: TAKE_LIMIT })).toEqual({
      cursor: undefined,
      skip: 0,
      take: TAKE_LIMIT,
    });
  });

  it("should read past the first page from any offset, even beyond the data", () => {
    expect(makePaginationObj({ skip: 5000, take: 1 })).toEqual({
      cursor: undefined,
      skip: 5000,
      take: 1,
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

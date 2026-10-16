import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

// Constant import
import { TAKE_LIMIT } from "@modules/pagination/constants/paginationLimit.constant";

// Target import
import { PaginationSchema, SimplePaginationSchema } from "./pagination.schema";

const CURSOR = { created_at: new Date("2026-01-01T00:00:00.000Z"), id: "c1" };

const failedProperties = async (
  schema: typeof PaginationSchema | typeof SimplePaginationSchema,
  input: Record<string, unknown>,
) =>
  (await validate(plainToInstance(schema, input)))
    .map(({ property }) => property)
    .sort();

describe("Schema: PaginationSchema", () => {
  it.each([
    ["nothing at all", {}],
    ["a first page", { skip: 0, take: 1 }],
    ["a page far past the data", { skip: 2_000_000, take: 10 }],
    ["the largest page", { skip: 0, take: TAKE_LIMIT }],
    ["a forward cursor page", { after: CURSOR, first: 5 }],
    [
      "a forward cursor page of the largest size",
      { after: CURSOR, first: TAKE_LIMIT },
    ],
    ["a backward cursor page", { before: CURSOR, last: 5 }],
    ["null fields, as a client leaves them out", { skip: null, take: null }],
  ])("should accept %s", async (_label, input) => {
    expect(await failedProperties(PaginationSchema, input)).toEqual([]);
  });

  it.each([
    ["a negative skip", { skip: -1, take: 5 }, ["skip"]],
    ["a fractional skip", { skip: 1.5, take: 5 }, ["skip"]],
    ["a take of zero", { skip: 0, take: 0 }, ["take"]],
    ["a negative take", { skip: 0, take: -5 }, ["take"]],
    ["a take above the cap", { skip: 0, take: TAKE_LIMIT + 1 }, ["take"]],
    ["a fractional take", { skip: 0, take: 2.5 }, ["take"]],
    ["a skip without a take", { skip: 5 }, ["skip"]],
    ["a take without a skip", { take: 5 }, ["take"]],
    ["a first of zero", { after: CURSOR, first: 0 }, ["first"]],
    [
      "a first above the cap",
      { after: CURSOR, first: TAKE_LIMIT + 1 },
      ["first"],
    ],
    [
      "a last above the cap",
      { before: CURSOR, last: TAKE_LIMIT + 1 },
      ["last"],
    ],
    ["a cursor without its size", { after: CURSOR }, ["after"]],
    ["a size without its cursor", { first: 5 }, ["first"]],
  ])("should refuse %s", async (_label, input, properties) => {
    expect(await failedProperties(PaginationSchema, input)).toEqual(
      expect.arrayContaining(properties),
    );
  });

  it.each([
    [
      "skip and a forward cursor",
      { skip: 0, take: 5, after: CURSOR, first: 5 },
    ],
    [
      "skip and a backward cursor",
      { skip: 0, take: 5, before: CURSOR, last: 5 },
    ],
    ["both cursors", { after: CURSOR, first: 5, before: CURSOR, last: 5 }],
  ])("should refuse to mix strategies: %s", async (_label, input) => {
    expect(
      (await failedProperties(PaginationSchema, input)).length,
    ).toBeGreaterThan(0);
  });

  it("should leave the cursor fields to the full schema", async () => {
    expect(
      await failedProperties(SimplePaginationSchema, {
        skip: 0,
        take: TAKE_LIMIT + 1,
      }),
    ).toEqual(["take"]);
  });
});

import { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Constant import
import { TAKE_LIMIT } from "@modules/pagination/constants/paginationLimit.constant";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";

// Target import
import { paginationMiddleware } from "./pagination.middleware";

const CURSOR = { created_at: "2026-01-01T00:00:00.000Z", id: "row-1" };

describe("Middleware: paginationMiddleware", () => {
  let translate: ReturnType<typeof vi.fn>;
  let next: NextFunction;
  let response: Response;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({ t: translate, query: {}, body: {}, ...overrides }) as unknown as Request;

  beforeEach(() => {
    translate = vi.fn((_key: string, fallback: string) => fallback);
    next = vi.fn();
    response = {} as Response;
  });

  it("should attach a pagination schema with the skip and take taken from the query segment", async () => {
    const request = buildRequest({ query: { skip: 10, take: 25 } });

    await paginationMiddleware({ segment: "QUERY" })(request, response, next);

    expect(request.pagination).toBeInstanceOf(PaginationSchema);
    expect({ ...request.pagination }).toEqual({
      skip: 10,
      take: 25,
      before: undefined,
      last: undefined,
      after: undefined,
      first: undefined,
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should attach a pagination schema with the cursor fields taken from the body segment", async () => {
    const request = buildRequest({
      query: { skip: 10, take: 25 },
      body: { after: CURSOR, first: 20 },
    });

    await paginationMiddleware({ segment: "BODY" })(request, response, next);

    expect({ ...request.pagination }).toEqual({
      skip: undefined,
      take: undefined,
      before: undefined,
      last: undefined,
      after: CURSOR,
      first: 20,
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should attach an all undefined pagination schema when the segment carries nothing", async () => {
    const request = buildRequest();

    await paginationMiddleware({ segment: "QUERY" })(request, response, next);

    expect({ ...request.pagination }).toEqual({
      skip: undefined,
      take: undefined,
      before: undefined,
      last: undefined,
      after: undefined,
      first: undefined,
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should hand the services the cursor a cursor string stands for", async () => {
    const cursor = { created_at: "2026-01-01T00:00:00.000Z", id: "row-1" };
    const encoded = Buffer.from(JSON.stringify(cursor)).toString("base64");
    const request = buildRequest({
      query: { after: encoded, first: 5, before: undefined },
    });

    await paginationMiddleware({ segment: "QUERY" })(request, response, next);

    expect(request.pagination?.after).toEqual(cursor);
    expect(request.pagination?.first).toBe(5);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should read a backward cursor the same way", async () => {
    const cursor = { created_at: "2026-01-01T00:00:00.000Z", id: "row-1" };
    const request = buildRequest({
      query: {
        before: Buffer.from(JSON.stringify(cursor)).toString("base64"),
        last: 5,
      },
    });

    await paginationMiddleware({ segment: "QUERY" })(request, response, next);

    expect(request.pagination?.before).toEqual(cursor);
  });

  it.each([
    ["text that is not base64", "not a cursor!"],
    ["base64 of something that is not a cursor", "bm9wZQ=="],
    ["a number where a cursor belongs", 5],
    ["a nested query object with a bad date", { created_at: "x", id: "y" }],
    [
      "base64 of a cursor with a bad date",
      Buffer.from('{"created_at":"x","id":"y"}').toString("base64"),
    ],
    [
      "base64 of a cursor with the wrong keys",
      Buffer.from('{"x":1}').toString("base64"),
    ],
  ])(
    "should answer %s with a 400 before any service runs",
    async (_label, value) => {
      const request = buildRequest({ query: { after: value, first: 5 } });

      await expect(
        paginationMiddleware({ segment: "QUERY" })(request, response, next),
      ).rejects.toEqual(
        expect.objectContaining({
          key: "@general/VALIDATION_FAIL",
          message: "Cursor is not valid.",
          statusCode: 400,
        }),
      );
      expect(request.pagination).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
    },
  );

  it("should reject a take above the allowed limit with a validation error", async () => {
    const request = buildRequest({ query: { skip: 0, take: TAKE_LIMIT + 1 } });

    await expect(
      paginationMiddleware({ segment: "QUERY" })(request, response, next),
    ).rejects.toEqual(
      expect.objectContaining({
        key: "@general/VALIDATION_FAIL",
        statusCode: 400,
      }),
    );
    expect(request.pagination).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject a skip provided without a take with a validation error", async () => {
    const request = buildRequest({ query: { skip: 5 } });

    await expect(
      paginationMiddleware({ segment: "QUERY" })(request, response, next),
    ).rejects.toEqual(
      expect.objectContaining({ key: "@general/VALIDATION_FAIL" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject mixing the skip and take pagination with the cursor pagination", async () => {
    const request = buildRequest({
      query: {
        skip: 0,
        take: 10,
        after: Buffer.from(JSON.stringify(CURSOR)).toString("base64"),
        first: 10,
      },
    });

    await expect(
      paginationMiddleware({ segment: "QUERY" })(request, response, next),
    ).rejects.toEqual(
      expect.objectContaining({
        key: "@general/VALIDATION_FAIL",
        message: expect.stringMatching(
          /cannot be used with|needs to be used with/i,
        ),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should treat an absent segment as an empty source", async () => {
    const request = buildRequest({});
    delete (request as any).query;

    await paginationMiddleware({ segment: "QUERY" })(request, response, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

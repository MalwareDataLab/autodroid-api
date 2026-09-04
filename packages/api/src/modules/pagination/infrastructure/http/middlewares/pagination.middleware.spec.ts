import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextFunction, Request, Response } from "express";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";

// Target import
import { paginationMiddleware } from "./pagination.middleware";

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
      body: { after: 5, first: 20 },
    });

    await paginationMiddleware({ segment: "BODY" })(request, response, next);

    expect({ ...request.pagination }).toEqual({
      skip: undefined,
      take: undefined,
      before: undefined,
      last: undefined,
      after: 5,
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

  it("should reject a take above the allowed limit with a validation error", async () => {
    const request = buildRequest({ query: { skip: 0, take: 1000 } });

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
      query: { skip: 0, take: 10, after: 1, first: 10 },
    });

    await expect(
      paginationMiddleware({ segment: "QUERY" })(request, response, next),
    ).rejects.toEqual(
      expect.objectContaining({ key: "@general/VALIDATION_FAIL" }),
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

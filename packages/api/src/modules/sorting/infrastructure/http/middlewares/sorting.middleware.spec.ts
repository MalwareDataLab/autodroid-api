import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextFunction, Request, Response } from "express";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Target import
import { sortingMiddleware } from "./sorting.middleware";

type SortableEntity = { created_at: Date; name: string };

const allowed = ["created_at", "name"] as const;

describe("Middleware: sortingMiddleware", () => {
  let translate: ReturnType<typeof vi.fn>;
  let next: NextFunction;
  let response: {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({ t: translate, query: {}, body: {}, ...overrides }) as unknown as Request;

  beforeEach(() => {
    translate = vi.fn((key: string, fallback?: string) => fallback ?? key);
    next = vi.fn();
    response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it("should attach the sorting fields taken from the query segment", async () => {
    const sort = [{ field: "created_at", order: SORT_ORDER.DESC }];
    const request = buildRequest({ query: { sort } });

    await sortingMiddleware<SortableEntity>({ segment: "QUERY", allowed })(
      request,
      response as unknown as Response,
      next,
    );

    expect(request.sorting).toEqual(sort);
    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });

  it("should attach the sorting fields taken from the body segment", async () => {
    const sort = [{ field: "name", order: SORT_ORDER.ASC }];
    const request = buildRequest({
      query: { sort: [{ field: "created_at", order: SORT_ORDER.DESC }] },
      body: { sort },
    });

    await sortingMiddleware<SortableEntity>({ segment: "BODY", allowed })(
      request,
      response as unknown as Response,
      next,
    );

    expect(request.sorting).toEqual(sort);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should attach an undefined sorting and call next when the segment carries no sort", async () => {
    const request = buildRequest();

    await sortingMiddleware<SortableEntity>({ segment: "QUERY", allowed })(
      request,
      response as unknown as Response,
      next,
    );

    expect(request.sorting).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });

  it("should answer 400 with a translated message for a field outside the allowed list", async () => {
    const request = buildRequest({
      query: { sort: [{ field: "secret_column", order: SORT_ORDER.ASC }] },
    });

    const result = await sortingMiddleware<SortableEntity>({
      segment: "QUERY",
      allowed,
    })(request, response as unknown as Response, next);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "Invalid sorting." });
    expect(translate).toHaveBeenCalledWith("Invalid sorting.");
    expect(request.sorting).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
    expect(result).toBe(response);
  });

  it("should reject an unknown sorting order with a validation error before reaching the sorting check", async () => {
    const request = buildRequest({
      query: { sort: [{ field: "created_at", order: "sideways" }] },
    });

    await expect(
      sortingMiddleware<SortableEntity>({ segment: "QUERY", allowed })(
        request,
        response as unknown as Response,
        next,
      ),
    ).rejects.toEqual(
      expect.objectContaining({ key: "@general/VALIDATION_FAIL" }),
    );
    expect(next).not.toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
  });

  it("should answer 400 for duplicated sorting fields", async () => {
    const request = buildRequest({
      query: {
        sort: [
          { field: "name", order: SORT_ORDER.ASC },
          { field: "name", order: SORT_ORDER.DESC },
        ],
      },
    });

    await sortingMiddleware<SortableEntity>({ segment: "QUERY", allowed })(
      request,
      response as unknown as Response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject more sorting fields than the schema allows with a validation error", async () => {
    const request = buildRequest({
      query: {
        sort: Array.from({ length: 6 }, (_, index) => ({
          field: `field_${index}`,
          order: SORT_ORDER.ASC,
        })),
      },
    });

    await expect(
      sortingMiddleware<SortableEntity>({ segment: "QUERY", allowed })(
        request,
        response as unknown as Response,
        next,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        key: "@general/VALIDATION_FAIL",
        statusCode: 400,
      }),
    );
    expect(next).not.toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
  });

  it("should parse a JSON encoded sort string into sorting fields", async () => {
    const request = buildRequest({
      query: { sort: '[{"field":"name","order":"asc"}]' },
    });

    await sortingMiddleware<SortableEntity>({ segment: "QUERY", allowed })(
      request,
      response as unknown as Response,
      next,
    );

    expect(request.sorting).toEqual([{ field: "name", order: SORT_ORDER.ASC }]);
    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });

  it("should reject a JSON encoded sort string that does not decode to an array", async () => {
    const request = buildRequest({
      query: { sort: '{"field":"name","order":"asc"}' },
    });

    await expect(
      sortingMiddleware<SortableEntity>({ segment: "QUERY", allowed })(
        request,
        response as unknown as Response,
        next,
      ),
    ).rejects.toEqual(
      expect.objectContaining({ key: "@general/VALIDATION_FAIL" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should treat an absent segment as an empty source", async () => {
    const request = buildRequest({});
    delete (request as any).query;

    await sortingMiddleware({ segment: "QUERY", allowed: ["created_at"] })(
      request,
      response as unknown as Response,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });
});

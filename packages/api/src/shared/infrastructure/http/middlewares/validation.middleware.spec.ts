import { validateOrReject, ValidationError } from "class-validator";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

// Target import
import {
  Segments,
  validateSchema,
  validateRequest,
} from "./validation.middleware";

vi.mock("class-validator", async importOriginal => {
  const actual = await importOriginal<typeof import("class-validator")>();
  return { ...actual, validateOrReject: vi.fn() };
});
vi.mock("class-transformer", () => ({
  plainToInstance: vi.fn((_schema, value) => value),
}));

const buildValidationError = (constraints?: Record<string, string>) => {
  const error = new ValidationError();
  if (constraints) error.constraints = constraints;
  return error;
};

const translate = vi.fn((_key: string, fallback: string) => fallback) as any;

class Schema {}

describe("Middleware: validateSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateOrReject as Mock).mockResolvedValue(undefined);
  });

  it("should resolve when validation succeeds", async () => {
    await expect(
      validateSchema({ value: {}, t: translate, schema: Schema }),
    ).resolves.toBeUndefined();
  });

  it("should throw a validation failure using the first constraint message", async () => {
    (validateOrReject as Mock).mockRejectedValueOnce([
      buildValidationError({ isEmail: "email must be valid" }),
    ]);

    await expect(
      validateSchema({ value: {}, t: translate, schema: Schema }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@general/VALIDATION_FAIL",
        message: "email must be valid",
      }),
    );
  });

  it("should throw a validation failure with the translated fallback when there are no constraints", async () => {
    (validateOrReject as Mock).mockRejectedValueOnce(buildValidationError());

    await expect(
      validateSchema({ value: {}, t: translate, schema: Schema }),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@general/VALIDATION_FAIL" }),
    );
    expect(translate).toHaveBeenCalledWith(
      "@general/VALIDATION_FAIL",
      "Validation error.",
    );
  });

  it("should throw a fatal validation failure for a non-validation error", async () => {
    (validateOrReject as Mock).mockRejectedValueOnce(new Error("boom"));

    await expect(
      validateSchema({ value: {}, t: translate, schema: Schema }),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@general/VALIDATION_FATAL_FAILURE" }),
    );
  });
});

describe("Middleware: validateRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateOrReject as Mock).mockResolvedValue(undefined);
  });

  const buildRequest = (): any => ({
    body: { field: "value" },
    t: translate,
  });

  it("should call next when the request segment is valid", async () => {
    const next = vi.fn();
    const middleware = validateRequest({ schema: Schema, segment: "BODY" });

    await middleware(buildRequest(), {} as any, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("should leave the ignored keys out of the validated segment and the request alone", async () => {
    const next = vi.fn();
    const request: any = {
      query: { status: "RUNNING", skip: "1", take: "1", sort: "[]" },
      t: translate,
    };
    const middleware = validateRequest({
      schema: Schema,
      segment: "QUERY",
      ignoreKeys: ["skip", "take", "sort"],
    });

    await middleware(request, {} as any, next);

    expect(validateOrReject).toHaveBeenCalledWith(
      { status: "RUNNING" },
      expect.anything(),
    );
    expect(request.query).toEqual({
      status: "RUNNING",
      skip: "1",
      take: "1",
      sort: "[]",
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("should validate the whole segment when no key is ignored", async () => {
    const middleware = validateRequest({ schema: Schema, segment: "QUERY" });

    await middleware(
      { query: { status: "RUNNING", skip: "1" }, t: translate } as any,
      {} as any,
      vi.fn(),
    );

    expect(validateOrReject).toHaveBeenCalledWith(
      { status: "RUNNING", skip: "1" },
      expect.anything(),
    );
  });

  it("should respond with the validation errors when the failure carries a payload", async () => {
    (validateOrReject as Mock).mockRejectedValueOnce([
      buildValidationError({ isEmail: "email must be valid" }),
    ]);
    const res: any = { status: vi.fn(() => res), json: vi.fn(() => res) };
    const middleware = validateRequest({ schema: Schema, segment: "BODY" });

    await middleware(buildRequest(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "@general/VALIDATION_FAIL",
        message: "email must be valid",
      }),
    );
  });

  it("should rethrow when the failure is not a payload-bearing validation error", async () => {
    (validateOrReject as Mock).mockRejectedValueOnce(new Error("boom"));
    const middleware = validateRequest({ schema: Schema, segment: "QUERY" });

    await expect(
      middleware({ query: {}, t: translate } as any, {} as any, vi.fn()),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@general/VALIDATION_FATAL_FAILURE" }),
    );
  });

  it("should expose the request segment keys", () => {
    expect(Segments).toMatchObject({ BODY: "body", QUERY: "query" });
  });
});

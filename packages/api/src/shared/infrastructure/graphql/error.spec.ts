import { beforeEach, describe, expect, it, vi } from "vitest";
import { GraphQLError } from "graphql";
import {
  AuthenticationError,
  AuthorizationError,
  ArgumentValidationError,
} from "type-graphql";
import * as Sentry from "@sentry/node";

// Error import
import { AppError } from "@shared/errors/AppError";
import { ValidationError } from "@shared/errors/ValidationError";

// Util import
import { logger } from "@shared/utils/logger";

// Handler import
import { errorPlugin, errorHandler } from "./error";

vi.mock("@sentry/node", () => ({ captureException: vi.fn() }));
vi.mock("@shared/utils/logger", () => ({ logger: { error: vi.fn() } }));

const buildFormattedError = (overrides: any = {}) => ({
  message: "formatted message",
  ...overrides,
});

const invokeWillSendResponse = async (response: any) => {
  const listener: any = await (errorPlugin.requestDidStart as any)();
  await listener.willSendResponse({ response });
};

describe("GraphQL: errorPlugin", () => {
  it("should null the data of a single result that carries errors", async () => {
    const response = {
      body: {
        kind: "single",
        singleResult: { errors: [{ message: "boom" }], data: { any: true } },
      },
    };

    await invokeWillSendResponse(response);

    expect(response.body.singleResult.data).toBeNull();
  });

  it("should keep the data of a single result without errors", async () => {
    const response = {
      body: { kind: "single", singleResult: { data: { any: true } } },
    };

    await invokeWillSendResponse(response);

    expect(response.body.singleResult.data).toEqual({ any: true });
  });

  it("should null the initial result data of an incremental response with errors", async () => {
    const response = {
      body: {
        kind: "incremental",
        initialResult: { errors: [{ message: "boom" }], data: { any: true } },
      },
    };

    await invokeWillSendResponse(response);

    expect(response.body.initialResult.data).toBeNull();
  });

  it("should keep the initial result data of an incremental response without errors", async () => {
    const response = {
      body: {
        kind: "incremental",
        initialResult: { data: { any: true } },
      },
    };

    await invokeWillSendResponse(response);

    expect(response.body.initialResult.data).toEqual({ any: true });
  });
});

describe("GraphQL: errorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should format an AppError reachable through the unwrapped original error", () => {
    const appError = new AppError({
      key: "@test/APP_ERROR",
      message: "app error message",
    });

    const result = errorHandler(buildFormattedError(), {
      originalError: appError,
    });

    expect(result).toMatchObject({
      message: "app error message",
      extensions: { code: "@test/APP_ERROR" },
    });
  });

  it("should flag an AppError with debug as fatal and fall back to defaults", () => {
    const appError = new AppError({
      key: "@test/APP_ERROR",
      message: "",
      debug: { reason: "boom" },
    });
    (appError as any).message = "";
    (appError as any).key = undefined;

    const result = errorHandler(buildFormattedError(), appError);

    expect(result).toMatchObject({
      message: "Internal server error.",
      extensions: { code: "INTERNAL_SERVER_ERROR", fatal: true },
    });
  });

  it("should format a type-graphql authentication error as unauthorized", () => {
    const result = errorHandler(
      buildFormattedError(),
      new AuthenticationError("nope"),
    );

    expect(result).toMatchObject({
      message: "Authentication error.",
      extensions: { code: "UNAUTHORIZED" },
    });
  });

  it("should format a type-graphql authorization error as forbidden", () => {
    const result = errorHandler(
      buildFormattedError(),
      new AuthorizationError(),
    );

    expect(result).toMatchObject({
      message: "Authentication error.",
      extensions: { code: "FORBIDDEN" },
    });
  });

  it("should format an argument validation error as graphql validation failed", () => {
    const validationError = new ArgumentValidationError([]);
    (validationError as any).extensions = { detail: "field" };

    const result = errorHandler(buildFormattedError(), validationError);

    expect(result.extensions).toMatchObject({
      detail: "field",
      code: "GRAPHQL_VALIDATION_FAILED",
    });
  });

  it("should format a ValidationError as bad user input without reporting to Sentry", () => {
    const result = errorHandler(
      buildFormattedError(),
      new ValidationError("processing_id is not a valid CUID"),
    );

    expect(result).toMatchObject({
      message: "processing_id is not a valid CUID",
      extensions: { code: "BAD_USER_INPUT" },
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("should format a ValidationError nested as originalError as bad user input", () => {
    const result = errorHandler(buildFormattedError(), {
      originalError: new ValidationError("dataset_id is not a valid CUID"),
    });

    expect(result).toMatchObject({
      message: "dataset_id is not a valid CUID",
      extensions: { code: "BAD_USER_INPUT" },
    });
  });

  it("should format a graphql error as graphql parse failed", () => {
    const graphqlError = new GraphQLError("parse boom", {
      extensions: { detail: "syntax" },
    });

    const result = errorHandler(buildFormattedError(), graphqlError);

    expect(result).toMatchObject({
      message: "parse boom",
      extensions: { code: "GRAPHQL_PARSE_FAILED", detail: "syntax" },
    });
  });

  it("should pass through a formatted error that already carries a known apollo code", () => {
    const formattedError = buildFormattedError({
      extensions: { code: "BAD_USER_INPUT" },
    });

    const result = errorHandler(formattedError, { plain: true });

    expect(result).toBe(formattedError);
  });

  it("should treat an unknown error as an internal server error and report it", () => {
    const result = errorHandler(buildFormattedError(), { plain: true });

    expect(result).toMatchObject({
      message: "Internal server error.",
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(logger.error).toHaveBeenCalledOnce();
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });

  it("should return the formatted error when formatting throws internally", () => {
    const formattedError: any = { message: "formatted" };
    Object.defineProperty(formattedError, "extensions", {
      get() {
        throw new Error("boom");
      },
    });

    const result = errorHandler(formattedError, { plain: true });

    expect(result).toBe(formattedError);
  });
});

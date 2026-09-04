import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/node";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { logger } from "@shared/utils/logger";

// Middleware import
import { errorMiddleware } from "./error.middleware";

const { YouchMock, youchToJSON } = vi.hoisted(() => {
  const toJSON = vi.fn();
  return {
    youchToJSON: toJSON,
    YouchMock: vi.fn(() => ({ toJSON })),
  };
});

vi.mock("youch", () => ({ default: YouchMock }));
vi.mock("@sentry/node", () => ({ captureException: vi.fn() }));
vi.mock("@shared/utils/logger", () => ({ logger: { error: vi.fn() } }));

const buildResponse = () => {
  const res: any = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
    send: vi.fn(() => res),
  };
  return res;
};

describe("Middleware: errorMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should respond with the AppError payload including the fatal flag when a debug is present", async () => {
    const res = buildResponse();
    const err = new AppError({
      key: "@test/KEY",
      message: "failure",
      debug: { reason: "boom" },
    });

    await errorMiddleware(err, {} as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: "@test/KEY",
      message: "failure",
      fatal: true,
    });
  });

  it("should respond with the AppError payload without the fatal flag when there is no debug", async () => {
    const res = buildResponse();
    const err = new AppError({ key: "@test/KEY", message: "failure" });

    await errorMiddleware(err, {} as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: "@test/KEY",
      message: "failure",
    });
  });

  it("should treat an object flagged with the AppError handler as an AppError", async () => {
    const res = buildResponse();
    const err: any = {
      handler: AppError.prototype.name,
      key: "@test/KEY",
      message: "failure",
      statusCode: 418,
    };

    await errorMiddleware(err, {} as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({
      code: "@test/KEY",
      message: "failure",
    });
  });

  it("should send an empty response when the AppError has no key or message", async () => {
    const res = buildResponse();
    const err: any = { handler: AppError.prototype.name, statusCode: 404 };

    await errorMiddleware(err, {} as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledOnce();
  });

  it("should respond with a JSON structure error when the failure mentions JSON", async () => {
    const res = buildResponse();
    youchToJSON.mockResolvedValueOnce({
      error: { message: "Unexpected token in JSON" },
    });

    await errorMiddleware(new Error("boom"), {} as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: "@general/JSON_ERROR",
      message: "Your request has problems on the JSON structure.",
    });
  });

  it("should report an unknown failure as an internal server error", async () => {
    const res = buildResponse();
    youchToJSON.mockResolvedValueOnce({ error: { message: "boom" } });

    await errorMiddleware(new Error("boom"), {} as any, res, vi.fn());

    expect(logger.error).toHaveBeenCalledOnce();
    expect(Sentry.captureException).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: "@general/INTERNAL_SERVER_ERROR",
      message: "Internal server error.",
      fatal: true,
    });
  });
});

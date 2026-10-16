import * as Sentry from "@sentry/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { logger } from "@shared/utils/logger";

// Target import
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
vi.mock("@shared/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

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

  it("should answer a request the body parser refused with the status it chose, without reporting a failure", async () => {
    const res = buildResponse();
    youchToJSON.mockResolvedValue({
      error: { message: "unsupported charset" },
    });
    const err = Object.assign(new Error("unsupported charset"), {
      status: 415,
      expose: true,
      type: "charset.unsupported",
    });

    await errorMiddleware(err, {} as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({
      code: "@general/INVALID_REQUEST",
      message: "unsupported charset",
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it.each([[500], [302]])(
    "should not pass a %s status through even when the failure is exposed",
    async status => {
      const res = buildResponse();
      youchToJSON.mockResolvedValue({ error: { message: "boom" } });
      const err = Object.assign(new Error("boom"), { status, expose: true });

      await errorMiddleware(err, {} as any, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
      expect(logger.error).toHaveBeenCalledOnce();
    },
  );

  it("should not pass a client-error status through when the failure is not meant to be exposed", async () => {
    const res = buildResponse();
    youchToJSON.mockResolvedValue({ error: { message: "secret detail" } });
    const err = Object.assign(new Error("secret detail"), { status: 403 });

    await errorMiddleware(err, {} as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain("secret detail");
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
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

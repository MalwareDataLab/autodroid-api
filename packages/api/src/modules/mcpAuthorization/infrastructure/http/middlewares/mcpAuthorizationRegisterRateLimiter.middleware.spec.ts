import { RateLimiterRes } from "rate-limiter-flexible";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Target import
import { mcpAuthorizationRegisterRateLimiterMiddleware } from "./mcpAuthorizationRegisterRateLimiter.middleware";

const consumeMock = vi.fn();
vi.mock("rate-limiter-flexible", async importOriginal => {
  const actual = await importOriginal<typeof import("rate-limiter-flexible")>();
  return {
    ...actual,
    RateLimiterRedis: vi.fn(() => ({ consume: consumeMock })),
  };
});

describe("Middleware: mcpAuthorizationRegisterRateLimiter", () => {
  let req: { ip?: string };
  let res: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    consumeMock.mockReset();
    consumeMock.mockResolvedValue(undefined);

    vi.spyOn(container, "resolve").mockReturnValue({
      connection: {},
    } as any);

    req = { ip: "203.0.113.1" };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    next = vi.fn();
  });

  it("should call next when under the rate limit", async () => {
    await mcpAuthorizationRegisterRateLimiterMiddleware(
      req as any,
      res as any,
      next,
    );

    expect(consumeMock).toHaveBeenCalledWith("203.0.113.1");
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should skip consuming and call next when the request has no IP", async () => {
    req.ip = undefined;

    await mcpAuthorizationRegisterRateLimiterMiddleware(
      req as any,
      res as any,
      next,
    );

    expect(consumeMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("should respond 429 with the SDK's error shape when the limit is actually exceeded", async () => {
    consumeMock.mockRejectedValueOnce(new RateLimiterRes(0, 60000));

    await mcpAuthorizationRegisterRateLimiterMiddleware(
      req as any,
      res as any,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "too_many_requests",
        error_description:
          "You have exceeded the rate limit for client registration requests.",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should propagate a genuine infra failure instead of reporting it as a rate limit", async () => {
    const connectionError = new Error("Connection is closed.");
    consumeMock.mockRejectedValueOnce(connectionError);

    await expect(
      mcpAuthorizationRegisterRateLimiterMiddleware(
        req as any,
        res as any,
        next,
      ),
    ).rejects.toThrowError(connectionError);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("should build a fresh limiter for every request rather than reuse a cached one", async () => {
    const { RateLimiterRedis } = await import("rate-limiter-flexible");

    await mcpAuthorizationRegisterRateLimiterMiddleware(
      req as any,
      res as any,
      next,
    );
    await mcpAuthorizationRegisterRateLimiterMiddleware(
      req as any,
      res as any,
      next,
    );

    expect(RateLimiterRedis).toHaveBeenCalledTimes(2);
  });
});

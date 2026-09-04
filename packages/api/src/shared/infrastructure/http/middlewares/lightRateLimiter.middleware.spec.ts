import { beforeEach, describe, expect, it, vi } from "vitest";

// Middleware import
import { lightRateLimiterMiddleware } from "./lightRateLimiter.middleware";

const { consumeMock } = vi.hoisted(() => ({ consumeMock: vi.fn() }));

vi.mock("rate-limiter-flexible", () => ({
  RateLimiterMemory: vi.fn(() => ({ consume: consumeMock })),
}));

describe("Middleware: lightRateLimiterMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should consume a point for the request ip and call next when under the limit", async () => {
    consumeMock.mockResolvedValueOnce(undefined);
    const next = vi.fn();

    await lightRateLimiterMiddleware({ ip: "1.2.3.4" } as any, {} as any, next);

    expect(consumeMock).toHaveBeenCalledWith("1.2.3.4");
    expect(next).toHaveBeenCalledOnce();
  });

  it("should skip the limiter and call next when there is no request ip", async () => {
    const next = vi.fn();

    await lightRateLimiterMiddleware({ ip: undefined } as any, {} as any, next);

    expect(consumeMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("should throw a rate limit error when the limit is exceeded", async () => {
    consumeMock.mockRejectedValueOnce(new Error("exceeded"));

    await expect(
      lightRateLimiterMiddleware({ ip: "1.2.3.4" } as any, {} as any, vi.fn()),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@security/RATE_LIMIT" }),
    );
  });
});

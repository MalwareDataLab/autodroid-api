import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getCorsConfig } from "@config/cors";

// Target import
import { mcpOriginMiddleware } from "./mcpOrigin.middleware";

vi.mock("@config/cors", () => ({ getCorsConfig: vi.fn() }));

const getCorsConfigMock = vi.mocked(getCorsConfig);

describe("Middleware: mcpOriginMiddleware", () => {
  const next = vi.fn();
  const res = { status: vi.fn(), json: vi.fn() };

  const run = (origin?: string) =>
    mcpOriginMiddleware(
      { headers: origin ? { origin } : {} } as any,
      res as any,
      next,
    );

  beforeEach(() => {
    res.status.mockReturnValue(res);
    getCorsConfigMock.mockReturnValue({
      origin: ["https://app.example", "https://other.example"],
    });
  });

  it("should let a client that sends no Origin through", () => {
    run();

    expect(next).toHaveBeenCalledExactlyOnceWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should let an allowed origin through", () => {
    run("https://other.example");

    expect(next).toHaveBeenCalledExactlyOnceWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should refuse an origin that is not allowed", () => {
    run("https://evil.example");

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledExactlyOnceWith(403);
    expect(res.json).toHaveBeenCalledExactlyOnceWith({
      error: "forbidden_origin",
    });
  });

  it("should refuse an origin that only starts like an allowed one", () => {
    run("https://app.example.evil.test");

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledExactlyOnceWith(403);
  });

  it("should let any origin through when every origin is allowed", () => {
    getCorsConfigMock.mockReturnValue({ origin: "*" });

    run("https://anything.example");

    expect(next).toHaveBeenCalledExactlyOnceWith();
    expect(res.status).not.toHaveBeenCalled();
  });
});

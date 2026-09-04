import { describe, expect, it, vi } from "vitest";

// Test target import
import { logger } from ".";

vi.mock("@config/env", () => ({ getEnvConfig: () => ({ isTestEnv: false }) }));

const MESSAGE = Symbol.for("message");

describe("Utils: logger", () => {
  it("should format the emitted message with its timestamp and level", () => {
    const [consoleTransport] = logger.transports;
    const logSpy = vi
      .spyOn(consoleTransport as Required<typeof consoleTransport>, "log")
      .mockImplementation((_info, next) => {
        if (next) next();
      });

    logger.info("hello");

    const formatted = (logSpy.mock.calls[0][0] as Record<symbol, string>)[
      MESSAGE
    ];
    expect(formatted).toContain("info");
    expect(formatted).toContain("hello");

    logSpy.mockRestore();
  });
});

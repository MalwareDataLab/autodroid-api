import * as Sentry from "@sentry/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Target import
import {
  parseCursor,
  serializeCursor,
} from "./paginationConnectionCursor.scalar";

vi.mock("@sentry/node", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));
vi.mock("@shared/utils/logger", () => ({ logger: { error: vi.fn() } }));

describe("Scalar: ConnectionCursor, error reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvConfig).mockReturnValue({ isTestEnv: false } as never);
  });

  it("should report a cursor the server failed to serialize, as a server fault", () => {
    expect(() => serializeCursor({})).toThrow("Fail to serialize the cursor");

    expect(Sentry.captureException).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ key: "@cursor_serialize/FAIL" }),
    );
  });

  it("should not report a cursor a client sent badly", () => {
    const encoded = Buffer.from(JSON.stringify({ foo: "bar" })).toString(
      "base64",
    );

    expect(() => parseCursor(encoded)).toThrow(
      "ConnectionCursor must be a cursor",
    );

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

// Target import
import { mcpBearerChallengeMiddleware } from "./mcpBearerChallenge.middleware";

vi.mock("@config/mcp", () => ({
  getMcpConfig: () => ({
    protectedResourceMetadataUrl:
      "https://api.autodroid.example/.well-known/oauth-protected-resource/mcp",
  }),
}));

describe("Middleware: mcpBearerChallengeMiddleware", () => {
  const next = vi.fn();
  const res = { status: vi.fn(), set: vi.fn(), json: vi.fn() };

  const run = (headers: Record<string, string>) =>
    mcpBearerChallengeMiddleware({ headers } as any, res as any, next);

  beforeEach(() => {
    res.status.mockReturnValue(res);
    res.set.mockReturnValue(res);
  });

  it("should answer a request without credentials with the bare challenge that names the metadata and the scopes to ask for first", () => {
    run({});

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.set).toHaveBeenCalledWith(
      "WWW-Authenticate",
      'Bearer resource_metadata="https://api.autodroid.example/.well-known/oauth-protected-resource/mcp", scope="autodroid:read autodroid:write"',
    );
    expect(res.json).toHaveBeenCalledWith({
      error: "unauthorized",
      error_description: "Missing Authorization header",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should hand a request that carries credentials on, for the bearer check to judge", () => {
    run({ authorization: "Bearer anything" });

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

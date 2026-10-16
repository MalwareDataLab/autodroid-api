import { beforeEach, describe, expect, it, vi } from "vitest";

// Middleware import
import { mcpBearerChallengeMiddleware } from "@modules/mcp/infrastructure/http/middlewares/mcpBearerChallenge.middleware";
import { mcpOriginMiddleware } from "@modules/mcp/infrastructure/http/middlewares/mcpOrigin.middleware";

// Target import
import { buildMcpRouter } from "./mcp.routes";

const mocks = vi.hoisted(() => ({
  requireBearerAuth: vi.fn(),
  bearerAuthHandler: vi.fn(),
  getMcpConfig: vi.fn(),
  controller: { handle: vi.fn(), methodNotAllowed: vi.fn() },
  McpController: vi.fn(),
  createMcpGraphQLExecutor: vi.fn(),
  deriveEveryMcpToolInput: vi.fn(),
}));

vi.mock(
  "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js",
  () => ({
    requireBearerAuth: mocks.requireBearerAuth.mockReturnValue(
      mocks.bearerAuthHandler,
    ),
  }),
);

vi.mock("@config/mcp", () => ({ getMcpConfig: mocks.getMcpConfig }));

vi.mock(
  "@modules/mcpAuthorization/infrastructure/oauth/mcpAuthorizationOAuth.provider",
  () => ({ mcpAuthorizationOAuthProvider: { name: "the-provider" } }),
);

vi.mock("@modules/mcp/infrastructure/http/controllers/mcp.controller", () => ({
  McpController: mocks.McpController,
}));

vi.mock("@modules/mcp/utils/createMcpGraphQLExecutor.util", () => ({
  createMcpGraphQLExecutor: mocks.createMcpGraphQLExecutor,
}));

vi.mock("@modules/mcp/utils/createMcpServer.util", () => ({
  deriveEveryMcpToolInput: mocks.deriveEveryMcpToolInput,
}));

const GRAPHQL_APP = { name: "the-graphql-app" } as any;

const routeLayer = (router: any, method: string) =>
  router.stack.find(
    (layer: any) => layer.route?.path === "/" && layer.route.methods[method],
  );

describe("Routes: mcp endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireBearerAuth.mockReturnValue(mocks.bearerAuthHandler);
    mocks.McpController.mockImplementation(() => mocks.controller);
    mocks.createMcpGraphQLExecutor.mockReturnValue("the-executor");
    mocks.getMcpConfig.mockReturnValue({
      protectedResourceMetadataUrl:
        "https://api.autodroid.example/.well-known/oauth-protected-resource/mcp",
      resource: "https://api.autodroid.example/mcp",
    });
  });

  it("should run every tool through the GraphQL app it is built with", () => {
    buildMcpRouter(GRAPHQL_APP);

    expect(mocks.createMcpGraphQLExecutor).toHaveBeenCalledExactlyOnceWith(
      GRAPHQL_APP,
    );
    expect(mocks.McpController).toHaveBeenCalledExactlyOnceWith("the-executor");
  });

  it("should derive every tool's input once while being built", () => {
    buildMcpRouter(GRAPHQL_APP);

    expect(mocks.deriveEveryMcpToolInput).toHaveBeenCalledExactlyOnceWith();
  });

  it("should fail to be built when a tool's input cannot be derived, so the server does not start", () => {
    const failure = new Error(
      "The validation isEmail on UserSchema.email has no MCP input counterpart.",
    );
    mocks.deriveEveryMcpToolInput.mockImplementationOnce(() => {
      throw failure;
    });

    expect(() => buildMcpRouter(GRAPHQL_APP)).toThrow(failure);
    expect(mocks.McpController).not.toHaveBeenCalled();
  });

  it("should check the origin of every request before anything else, then register POST, GET and DELETE on the root path", () => {
    const router = buildMcpRouter(GRAPHQL_APP) as any;

    expect(router.stack[0].handle).toBe(mcpOriginMiddleware);
    expect(
      router.stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          method: Object.keys(layer.route.methods)[0],
        })),
    ).toEqual([
      { path: "/", method: "post" },
      { path: "/", method: "get" },
      { path: "/", method: "delete" },
    ]);
  });

  it("should reject GET and DELETE with methodNotAllowed", () => {
    const router = buildMcpRouter(GRAPHQL_APP);

    expect(routeLayer(router, "get").route.stack[0].handle).toBe(
      mocks.controller.methodNotAllowed,
    );
    expect(routeLayer(router, "delete").route.stack[0].handle).toBe(
      mocks.controller.methodNotAllowed,
    );
  });

  it("should answer a request without credentials first, then check the bearer token bound to the MCP resource, then hand the request to the controller", async () => {
    const router = buildMcpRouter(GRAPHQL_APP);

    const [challenge, guard, handlerWrapper] = routeLayer(
      router,
      "post",
    ).route.stack.map((layer: any) => layer.handle);

    expect(challenge).toBe(mcpBearerChallengeMiddleware);
    expect(guard).toBe(mocks.bearerAuthHandler);
    expect(mocks.requireBearerAuth).toHaveBeenCalledExactlyOnceWith({
      verifier: { name: "the-provider" },
      resourceMetadataUrl:
        "https://api.autodroid.example/.well-known/oauth-protected-resource/mcp",
      expectedResource: new URL("https://api.autodroid.example/mcp"),
    });

    const req = {} as any;
    const res = {} as any;
    await handlerWrapper(req, res);
    expect(mocks.controller.handle).toHaveBeenCalledWith(req, res);
  });
});

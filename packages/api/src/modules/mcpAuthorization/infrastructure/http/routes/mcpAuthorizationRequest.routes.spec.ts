import { describe, expect, it } from "vitest";

// Middleware import
import { userAuthenticationMiddleware } from "@modules/user/infrastructure/http/middlewares/userAuthentication.middleware";

// Target import
import { mcpAuthorizationRequestRouter } from "./mcpAuthorizationRequest.routes";

const registeredRoutes = () =>
  (mcpAuthorizationRequestRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

const middlewareHandles = (path: string) =>
  (mcpAuthorizationRequestRouter as any).stack
    .find((layer: any) => layer.route?.path === path)
    .route.stack.map((layer: any) => layer.handle);

describe("Routes: mcp authorization request", () => {
  it("should register the show and decision routes", () => {
    expect(registeredRoutes()).toEqual([
      { method: "get", path: "/:request_id" },
      { method: "post", path: "/:request_id/decision" },
    ]);
  });

  it("should guard the show route with the user authentication middleware", () => {
    expect(middlewareHandles("/:request_id")).toContain(
      userAuthenticationMiddleware,
    );
  });

  it("should guard the decision route with the user authentication middleware", () => {
    expect(middlewareHandles("/:request_id/decision")).toContain(
      userAuthenticationMiddleware,
    );
  });
});

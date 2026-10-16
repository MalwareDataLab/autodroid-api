import { describe, expect, it } from "vitest";

// Middleware import
import { userAuthenticationMiddleware } from "@modules/user/infrastructure/http/middlewares/userAuthentication.middleware";

// Target import
import { cliAuthorizationRouter } from "./cliAuthorization.routes";

const registeredRoutes = () =>
  (cliAuthorizationRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

const middlewareHandles = (path: string) =>
  (cliAuthorizationRouter as any).stack
    .find((layer: any) => layer.route?.path === path)
    .route.stack.map((layer: any) => layer.handle);

describe("Routes: cli authorization", () => {
  it("should register the register, authorize and token routes", () => {
    expect(registeredRoutes()).toEqual([
      { method: "post", path: "/register" },
      { method: "post", path: "/authorize" },
      { method: "post", path: "/token" },
    ]);
  });

  it("should leave the register route unauthenticated", () => {
    expect(middlewareHandles("/register")).not.toContain(
      userAuthenticationMiddleware,
    );
  });

  it("should guard the authorize route with the user authentication middleware", () => {
    expect(middlewareHandles("/authorize")).toContain(
      userAuthenticationMiddleware,
    );
  });

  it("should leave the token route unauthenticated", () => {
    expect(middlewareHandles("/token")).not.toContain(
      userAuthenticationMiddleware,
    );
  });
});

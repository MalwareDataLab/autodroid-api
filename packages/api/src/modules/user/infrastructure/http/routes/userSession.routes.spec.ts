import { describe, expect, it } from "vitest";

// Target import
import { userSessionRouter } from "./userSession.routes";

const registeredRoutes = () =>
  (userSessionRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

describe("Routes: userSession", () => {
  it("should register every user session route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "get", path: "/" },
      { method: "delete", path: "/" },
    ]);
  });
});

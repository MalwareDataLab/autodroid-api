import { describe, expect, it } from "vitest";

// Target import
import { userProcessingRouter } from "./userProcessing.routes";

const registeredRoutes = () =>
  (userProcessingRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

describe("Routes: userProcessing", () => {
  it("should register every user processing route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "post", path: "/" },
      { method: "get", path: "/" },
      { method: "get", path: "/estimated-execution-time" },
      { method: "get", path: "/:processing_id" },
      { method: "delete", path: "/:processing_id" },
      { method: "patch", path: "/:processing_id/extend-keep-until" },
      { method: "patch", path: "/:processing_id/update-visibility" },
      { method: "get", path: "/:processing_id/estimated-finish-time" },
    ]);
  });

  it("should register every literal path before the parameter that would shadow it", () => {
    const routes = registeredRoutes();

    const literalIndex = routes.findIndex(
      (route: any) =>
        route.method === "get" && route.path === "/estimated-execution-time",
    );
    const parameterIndex = routes.findIndex(
      (route: any) =>
        route.method === "get" && route.path === "/:processing_id",
    );

    expect(literalIndex).toBeLessThan(parameterIndex);
  });
});

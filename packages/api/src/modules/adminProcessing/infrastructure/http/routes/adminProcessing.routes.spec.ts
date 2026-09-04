import { describe, expect, it } from "vitest";

// Target import
import { adminProcessingRouter } from "./adminProcessing.routes";

const registeredRoutes = () =>
  (adminProcessingRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

describe("Routes: adminProcessing", () => {
  it("should register every admin processing route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "get", path: "/" },
      { method: "get", path: "/estimated-execution-time" },
      { method: "get", path: "/:processing_id" },
      { method: "put", path: "/:processing_id" },
      { method: "delete", path: "/clean-expired" },
      { method: "patch", path: "/fail-dangling" },
      { method: "delete", path: "/:processing_id" },
    ]);
  });

  it("should register every literal path before the parameter that would shadow it", () => {
    const routes = registeredRoutes();

    const shadowIndex = (method: string, literal: string) => ({
      literal: routes.findIndex(
        (route: any) => route.method === method && route.path === literal,
      ),
      parameter: routes.findIndex(
        (route: any) =>
          route.method === method && route.path === "/:processing_id",
      ),
    });

    const estimation = shadowIndex("get", "/estimated-execution-time");
    expect(estimation.literal).toBeLessThan(estimation.parameter);

    const cleanExpired = shadowIndex("delete", "/clean-expired");
    expect(cleanExpired.literal).toBeLessThan(cleanExpired.parameter);
  });
});

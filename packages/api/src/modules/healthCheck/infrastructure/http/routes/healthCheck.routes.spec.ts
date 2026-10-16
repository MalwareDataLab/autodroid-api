import { describe, expect, it, vi } from "vitest";

// Target import
import { healthCheckRouter } from "./healthCheck.routes";

const registeredRoutes = () =>
  (healthCheckRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

describe("Routes: healthCheck", () => {
  it("should register every health check route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "get", path: "/" },
      { method: "get", path: "/readiness" },
      { method: "get", path: "/liveness" },
    ]);
  });

  it("should answer the root and liveness probes with an empty 200 response", () => {
    const probes = (healthCheckRouter as any).stack
      .filter(
        (layer: any) =>
          layer.route && ["/", "/liveness"].includes(layer.route.path),
      )
      .map((layer: any) => layer.route.stack[0].handle);

    expect(probes).toHaveLength(2);

    probes.forEach((handle: any) => {
      const send = vi.fn();
      const response = { status: vi.fn().mockReturnValue({ send }) };

      handle({}, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(send).toHaveBeenCalledWith();
    });
  });
});

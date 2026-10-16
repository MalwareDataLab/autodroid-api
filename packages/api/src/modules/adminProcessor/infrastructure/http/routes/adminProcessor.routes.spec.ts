import { describe, expect, it } from "vitest";

// Target import
import { adminProcessorRouter } from "./adminProcessor.routes";

const registeredRoutes = () =>
  (adminProcessorRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

describe("Routes: adminProcessor", () => {
  it("should register every admin processor route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "get", path: "/" },
      { method: "get", path: "/:processor_id" },
      { method: "post", path: "/" },
      { method: "put", path: "/:processor_id" },
      { method: "delete", path: "/:processor_id" },
    ]);
  });
});

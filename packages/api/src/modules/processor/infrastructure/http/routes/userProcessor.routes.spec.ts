import { describe, expect, it } from "vitest";

// Target import
import { userProcessorRouter } from "./userProcessor.routes";

const registeredRoutes = () =>
  (userProcessorRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

describe("Routes: userProcessor", () => {
  it("should register every user processor route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "get", path: "/" },
      { method: "get", path: "/:processor_id" },
    ]);
  });
});

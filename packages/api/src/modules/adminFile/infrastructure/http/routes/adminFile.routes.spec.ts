import { describe, expect, it } from "vitest";

// Target import
import { adminFileRouter } from "./adminFile.routes";

const registeredRoutes = () =>
  (adminFileRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

describe("Routes: adminFile", () => {
  it("should register every admin file route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "delete", path: "/remove-dangling-files" },
    ]);
  });
});

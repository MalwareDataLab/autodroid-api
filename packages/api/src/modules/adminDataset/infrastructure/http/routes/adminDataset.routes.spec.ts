import { describe, expect, it } from "vitest";

// Target import
import { adminDatasetRouter } from "./adminDataset.routes";

const registeredRoutes = () =>
  (adminDatasetRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

describe("Routes: adminDataset", () => {
  it("should register every admin dataset route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "get", path: "/" },
      { method: "get", path: "/:dataset_id" },
      { method: "put", path: "/:dataset_id" },
      { method: "delete", path: "/:dataset_id" },
      { method: "patch", path: "/:dataset_id/update-visibility" },
    ]);
  });
});

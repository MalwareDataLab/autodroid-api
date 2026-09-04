import { describe, expect, it } from "vitest";

// Target import
import { userDatasetRouter } from "./userDataset.routes";

const registeredRoutes = () =>
  (userDatasetRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

describe("Routes: userDataset", () => {
  it("should register every user dataset route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "get", path: "/" },
      { method: "get", path: "/:dataset_id" },
      { method: "post", path: "/" },
      { method: "put", path: "/:dataset_id" },
      { method: "delete", path: "/:dataset_id" },
      { method: "post", path: "/:dataset_id/request-publication" },
    ]);
  });
});

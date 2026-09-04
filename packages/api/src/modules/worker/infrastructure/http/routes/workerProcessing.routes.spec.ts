import { describe, expect, it } from "vitest";

// Target import
import { workerProcessingRouter } from "./workerProcessing.routes";

const registeredRoutes = () =>
  (workerProcessingRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

describe("Routes: workerProcessing", () => {
  it("should register every worker processing route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "get", path: "/:processing_id" },
      { method: "post", path: "/:processing_id/progress" },
      { method: "post", path: "/:processing_id/result_file/generate_upload" },
      { method: "post", path: "/:processing_id/result_file/uploaded" },
      { method: "post", path: "/:processing_id/metrics_file/generate_upload" },
      { method: "post", path: "/:processing_id/metrics_file/uploaded" },
      { method: "post", path: "/:processing_id/success" },
      { method: "post", path: "/:processing_id/failure" },
    ]);
  });
});

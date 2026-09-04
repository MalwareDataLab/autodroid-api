import { describe, expect, it } from "vitest";

import { adminDatasetRouter } from "@modules/adminDataset/infrastructure/http/routes/adminDataset.routes";
import { adminFileRouter } from "@modules/adminFile/infrastructure/http/routes/adminFile.routes";
import { adminProcessorRouter } from "@modules/adminProcessor/infrastructure/http/routes/adminProcessor.routes";
import { adminProcessingRouter } from "@modules/adminProcessing/infrastructure/http/routes/adminProcessing.routes";
import { adminWorkerRouter } from "@modules/adminWorker/infrastructure/http/routes/adminWorker.routes";

// Target import
import { adminRouter } from "./admin.routes";

const mountPath = (layer: any) =>
  layer.regexp.source
    .replace(/^\^/, "")
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, "")
    .replace(/\\\//g, "/");

const mountedRouters = () =>
  (adminRouter as any).stack
    .filter((layer: any) => layer.name === "router")
    .map((layer: any) => ({ path: mountPath(layer), handle: layer.handle }));

describe("Routes: admin", () => {
  it("should mount every admin module router at its base path in order", () => {
    expect(mountedRouters()).toEqual([
      { path: "/dataset", handle: adminDatasetRouter },
      { path: "/file", handle: adminFileRouter },
      { path: "/processor", handle: adminProcessorRouter },
      { path: "/processing", handle: adminProcessingRouter },
      { path: "/worker", handle: adminWorkerRouter },
    ]);
  });

  it("should not register any route directly on the admin router", () => {
    expect(
      (adminRouter as any).stack.filter((layer: any) => layer.route),
    ).toEqual([]);
  });

  it("should apply the admin authentication middleware before every mounted router", () => {
    const { stack } = adminRouter as any;
    const firstMountIndex = stack.findIndex(
      (layer: any) => layer.name === "router",
    );

    expect(firstMountIndex).toBeGreaterThan(0);
    expect(
      stack
        .slice(0, firstMountIndex)
        .every((layer: any) => mountPath(layer) === ""),
    ).toBe(true);
  });
});

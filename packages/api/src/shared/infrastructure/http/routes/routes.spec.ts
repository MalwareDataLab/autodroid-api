import { describe, expect, it } from "vitest";

import { healthCheckRouter } from "@modules/healthCheck/infrastructure/http/routes/healthCheck.routes";
import { workerRouter } from "@modules/worker/infrastructure/http/routes/worker.routes";
import { adminRouter } from "@modules/admin/infrastructure/http/routes/admin.routes";
import { userRouter } from "@modules/user/infrastructure/http/routes/user.routes";
import { userDatasetRouter } from "@modules/dataset/infrastructure/http/routes/userDataset.routes";
import { userProcessorRouter } from "@modules/processor/infrastructure/http/routes/userProcessor.routes";
import { userProcessingRouter } from "@modules/processing/infrastructure/http/routes/userProcessing.routes";

// Target import
import { router } from "./index";

const mountPath = (layer: any) =>
  layer.regexp.source
    .replace(/^\^/, "")
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, "")
    .replace(/\\\//g, "/");

const mountedRouters = () =>
  (router as any).stack
    .filter((layer: any) => layer.name === "router")
    .map((layer: any) => ({ path: mountPath(layer), handle: layer.handle }));

describe("Routes: shared root router", () => {
  it("should mount every module router at its base path in order", () => {
    expect(mountedRouters()).toEqual([
      { path: "/health", handle: healthCheckRouter },
      { path: "/worker", handle: workerRouter },
      { path: "/admin", handle: adminRouter },
      { path: "/user", handle: userRouter },
      { path: "/processor", handle: userProcessorRouter },
      { path: "/dataset", handle: userDatasetRouter },
      { path: "/processing", handle: userProcessingRouter },
    ]);
  });

  it("should not register any route directly on the root router", () => {
    expect((router as any).stack.filter((layer: any) => layer.route)).toEqual(
      [],
    );
  });

  it("should guard every authenticated mount with a middleware sharing its base path", () => {
    const { stack } = router as any;

    const guardedMounts = [
      adminRouter,
      userRouter,
      userProcessorRouter,
      userDatasetRouter,
      userProcessingRouter,
    ];

    guardedMounts.forEach(subRouter => {
      const mountIndex = stack.findIndex(
        (layer: any) => layer.handle === subRouter,
      );
      const guard = stack[mountIndex - 1];

      expect(guard.handle).not.toBe(subRouter);
      expect(mountPath(guard)).toBe(mountPath(stack[mountIndex]));
    });
  });

  it("should leave the health check and worker mounts unguarded", () => {
    const { stack } = router as any;

    [healthCheckRouter, workerRouter].forEach(subRouter => {
      const mountIndex = stack.findIndex(
        (layer: any) => layer.handle === subRouter,
      );
      const previous = stack[mountIndex - 1];

      expect(previous ? mountPath(previous) : null).not.toBe(
        mountPath(stack[mountIndex]),
      );
    });
  });
});

import { describe, expect, it } from "vitest";

import { workerProcessingRouter } from "./workerProcessing.routes";

// Target import
import { workerRouter } from "./worker.routes";

const registeredRoutes = () =>
  (workerRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

const mountPath = (layer: any) =>
  layer.regexp.source
    .replace(/^\^/, "")
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, "")
    .replace(/\\\//g, "/");

describe("Routes: worker", () => {
  it("should register every worker route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "post", path: "/register" },
      { method: "post", path: "/refresh-token" },
      { method: "post", path: "/access-token" },
      { method: "get", path: "/" },
    ]);
  });

  it("should mount the worker processing router at its base path", () => {
    expect(
      (workerRouter as any).stack
        .filter((layer: any) => layer.name === "router")
        .map((layer: any) => ({
          path: mountPath(layer),
          handle: layer.handle,
        })),
    ).toEqual([{ path: "/processing", handle: workerProcessingRouter }]);
  });

  it("should guard the worker processing mount with an authentication middleware sharing its base path", () => {
    const { stack } = workerRouter as any;

    const mountIndex = stack.findIndex(
      (layer: any) => layer.handle === workerProcessingRouter,
    );
    const guard = stack[mountIndex - 1];

    expect(mountPath(guard)).toBe("/processing");
    expect(guard.route).toBeUndefined();
  });
});

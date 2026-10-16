import { describe, expect, it } from "vitest";

// Middleware import
import { workerAuthenticationMiddleware } from "../middlewares/workerAuthentication.middleware";
import { workerAuthenticationGuardMiddleware } from "../middlewares/workerAuthenticationGuard.middleware";

// Router import
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

  it("should authenticate and then guard the worker processing mount, sharing its base path", () => {
    const { stack } = workerRouter as any;

    const mountIndex = stack.findIndex(
      (layer: any) => layer.handle === workerProcessingRouter,
    );
    const [authentication, guard] = stack.slice(mountIndex - 2, mountIndex);

    expect(mountPath(authentication)).toBe("/processing");
    expect(authentication.handle).toBe(workerAuthenticationMiddleware);
    expect(mountPath(guard)).toBe("/processing");
    expect(guard.handle).toBe(workerAuthenticationGuardMiddleware);
  });

  it("should authenticate and then guard the worker show route", () => {
    const showRoute = (workerRouter as any).stack.find(
      (layer: any) => layer.route?.path === "/",
    ).route;

    expect(
      showRoute.stack.slice(0, 2).map((layer: any) => layer.handle),
    ).toEqual([
      workerAuthenticationMiddleware,
      workerAuthenticationGuardMiddleware,
    ]);
  });
});

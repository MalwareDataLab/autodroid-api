import { describe, expect, it } from "vitest";

import { userSessionRouter } from "./userSession.routes";

// Target import
import { userRouter } from "./user.routes";

const registeredRoutes = () =>
  (userRouter as any).stack
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

describe("Routes: user", () => {
  it("should register every user route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "get", path: "/" },
      { method: "put", path: "/" },
      { method: "patch", path: "/learning-data" },
    ]);
  });

  it("should mount the user session router at its base path", () => {
    expect(
      (userRouter as any).stack
        .filter((layer: any) => layer.name === "router")
        .map((layer: any) => ({
          path: mountPath(layer),
          handle: layer.handle,
        })),
    ).toEqual([{ path: "/session", handle: userSessionRouter }]);
  });
});

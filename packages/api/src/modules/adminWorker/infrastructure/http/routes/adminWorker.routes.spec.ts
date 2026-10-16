import { describe, expect, it } from "vitest";

// Util import
import { runRouteQueryMiddlewares } from "@/test/utils/runRouteQueryMiddlewares.util";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Router import
import { adminWorkerRegistrationTokenRouter } from "./adminWorkerRegistrationToken.routes";

// Target import
import { adminWorkerRouter } from "./adminWorker.routes";

const registeredRoutes = () =>
  (adminWorkerRouter as any).stack
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

describe("Routes: adminWorker", () => {
  it("should register every admin worker route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "get", path: "/" },
      { method: "get", path: "/:worker_id" },
      { method: "put", path: "/:worker_id" },
      { method: "delete", path: "/clean-missing" },
      { method: "delete", path: "/:worker_id" },
    ]);
  });

  it("should mount the registration token router at its base path", () => {
    expect(
      (adminWorkerRouter as any).stack
        .filter((layer: any) => layer.name === "router")
        .map((layer: any) => ({
          path: mountPath(layer),
          handle: layer.handle,
        })),
    ).toEqual([
      {
        path: "/registration-token",
        handle: adminWorkerRegistrationTokenRouter,
      },
    ]);
  });

  it("should register every literal path before the parameter that would shadow it", () => {
    const routes = registeredRoutes();

    const literalIndex = routes.findIndex(
      (route: any) =>
        route.method === "delete" && route.path === "/clean-missing",
    );
    const parameterIndex = routes.findIndex(
      (route: any) => route.method === "delete" && route.path === "/:worker_id",
    );

    expect(literalIndex).toBeLessThan(parameterIndex);
  });

  it("should mount the registration token router before the parameter route that would shadow it", () => {
    const { stack } = adminWorkerRouter as any;

    const mountIndex = stack.findIndex(
      (layer: any) => layer.handle === adminWorkerRegistrationTokenRouter,
    );
    const parameterIndex = stack.findIndex(
      (layer: any) => layer.route && layer.route.path === "/:worker_id",
    );

    expect(mountIndex).toBeLessThan(parameterIndex);
  });

  it("should let the page and sorting through the filter validation of the list route", async () => {
    const outcome = await runRouteQueryMiddlewares(adminWorkerRouter, "/", {
      skip: "2",
      take: "3",
      sort: JSON.stringify([{ field: "id", order: "asc" }]),
    });

    expect(outcome).toEqual({
      pagination: { skip: 2, take: 3 },
      sorting: [{ field: "id", order: SORT_ORDER.ASC }],
    });
  });

  it.each([
    ["archived=true", { archived: "true" }],
    ["archived=false", { archived: "false" }],
    ["missing=true", { missing: "true" }],
    ["missing=false", { missing: "false" }],
  ])(
    "should read the boolean filter %s written in the query as a boolean",
    async (_label, query) => {
      const outcome = await runRouteQueryMiddlewares(
        adminWorkerRouter,
        "/",
        query,
      );

      expect(outcome).toEqual({ pagination: {}, sorting: undefined });
    },
  );
});

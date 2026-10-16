import { describe, expect, it } from "vitest";

// Util import
import { runRouteQueryMiddlewares } from "@/test/utils/runRouteQueryMiddlewares.util";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Target import
import { adminWorkerRegistrationTokenRouter } from "./adminWorkerRegistrationToken.routes";

const registeredRoutes = () =>
  (adminWorkerRegistrationTokenRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

describe("Routes: adminWorkerRegistrationToken", () => {
  it("should register every admin worker registration token route", () => {
    expect(registeredRoutes()).toEqual([
      { method: "post", path: "/" },
      { method: "get", path: "/" },
      { method: "get", path: "/:worker_registration_token_id" },
      { method: "delete", path: "/:worker_registration_token_id" },
    ]);
  });

  it("should let the page and sorting through the filter validation of the list route", async () => {
    const outcome = await runRouteQueryMiddlewares(
      adminWorkerRegistrationTokenRouter,
      "/",
      {
        skip: "2",
        take: "3",
        sort: JSON.stringify([{ field: "id", order: "asc" }]),
      },
    );

    expect(outcome).toEqual({
      pagination: { skip: 2, take: 3 },
      sorting: [{ field: "id", order: SORT_ORDER.ASC }],
    });
  });

  it.each([
    ["archived=true", { archived: "true" }],
    ["archived=false", { archived: "false" }],
    ["activated=true", { activated: "true" }],
    ["activated=false", { activated: "false" }],
    ["activatable=true", { activatable: "true" }],
    ["activatable=false", { activatable: "false" }],
    ["expired=true", { expired: "true" }],
    ["expired=false", { expired: "false" }],
    ["is_unlimited_usage=true", { is_unlimited_usage: "true" }],
    ["is_unlimited_usage=false", { is_unlimited_usage: "false" }],
  ])(
    "should read the boolean filter %s written in the query as a boolean",
    async (_label, query) => {
      const outcome = await runRouteQueryMiddlewares(
        adminWorkerRegistrationTokenRouter,
        "/",
        query,
      );

      expect(outcome).toEqual({ pagination: {}, sorting: undefined });
    },
  );
});

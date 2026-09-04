import { describe, expect, it } from "vitest";

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
});

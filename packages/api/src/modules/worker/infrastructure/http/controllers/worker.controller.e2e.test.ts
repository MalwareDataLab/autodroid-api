import { describe, expect, it } from "vitest";

// Util import
import { createAuthorizedWorker } from "@/test/utils/workerAuth.util";

describe("E2E: WorkerController", () => {
  it("should show the authenticated worker", async context => {
    const { worker, accessToken } = await createAuthorizedWorker();

    const response = await context.request
      .get("/worker")
      .set("Authorization", `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: worker.id });
  });

  it("should fail showing the worker when unauthenticated", async context => {
    const response = await context.request.get("/worker").send();

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: "@general/INTERNAL_SERVER_ERROR",
    });
  });

  it("should fail showing the worker with an invalid token", async context => {
    const response = await context.request
      .get("/worker")
      .set("Authorization", `Bearer invalid.worker.token`)
      .send();

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: "@general/INTERNAL_SERVER_ERROR",
    });
  });
});

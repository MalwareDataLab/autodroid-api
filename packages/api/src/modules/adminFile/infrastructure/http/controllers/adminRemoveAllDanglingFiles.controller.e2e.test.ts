import { describe, expect, it } from "vitest";

describe("E2E: AdminRemoveAllDanglingFilesController", () => {
  it("should remove all dangling files for an admin", async context => {
    const response = await context
      .adminAuthorized(
        context.request.delete("/admin/file/remove-dangling-files"),
      )
      .send();

    expect(response.status).toBe(200);
  });

  it("should fail removing all dangling files for a non-admin", async context => {
    const response = await context
      .userAuthorized(
        context.request.delete("/admin/file/remove-dangling-files"),
      )
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@admin_auth_middleware/NOT_AN_ADMIN",
    });
  });
});

import { describe, expect, it } from "vitest";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

describe("E2E: AdminProcessingFailDanglingController", () => {
  it("should fail dangling processes for an admin", async context => {
    const response = await context
      .adminAuthorized(context.request.patch("/admin/processing/fail-dangling"))
      .send({ status: PROCESSING_STATUS.PENDING });

    expect(response.status).toBe(200);
  });

  it("should fail dangling processes for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.patch("/admin/processing/fail-dangling"))
      .send({ status: PROCESSING_STATUS.PENDING });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@admin_auth_middleware/NOT_AN_ADMIN",
    });
  });
});

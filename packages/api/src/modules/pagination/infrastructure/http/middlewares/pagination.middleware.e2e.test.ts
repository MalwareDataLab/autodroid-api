import { describe, expect, it } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

describe("E2E: PaginationMiddleware", () => {
  it("should accept valid skip and take pagination arguments", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(
        context.request.get("/dataset").query({ skip: 0, take: 5 }),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toEqual(expect.any(Array));
  });

  it("should return a validation error for a negative skip value", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(
        context.request.get("/dataset").query({ skip: -1, take: 5 }),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@general/VALIDATION_FAIL",
    });
  });
});

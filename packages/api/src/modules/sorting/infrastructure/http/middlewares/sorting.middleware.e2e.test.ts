import { describe, expect, it } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

describe("E2E: SortingMiddleware", () => {
  it("should accept a valid sorting argument", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(
        context.request.get("/dataset").query({
          sort: JSON.stringify([{ field: "created_at", order: "asc" }]),
        }),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toEqual(expect.any(Array));
  });

  it("should list without a sorting argument", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.get("/dataset"))
      .send();

    expect(response.status).toBe(200);
  });

  it("should return an error for an invalid sorting field", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(
        context.request.get("/dataset").query({
          sort: JSON.stringify([{ field: "not_a_field", order: "asc" }]),
        }),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: expect.any(String),
    });
  });
});

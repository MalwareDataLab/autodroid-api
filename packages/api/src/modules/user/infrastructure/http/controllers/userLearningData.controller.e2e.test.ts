import { describe, expect, it } from "vitest";

describe("E2E: UserLearningDataController", () => {
  it("should update user learning data", async context => {
    const response = await context
      .userAuthorized(context.request.patch("/user/learning-data"))
      .send({ data: { onboarding: true, step: 3 } });

    expect(response.status).toBe(200);
    expect(response.body.learning_data).toMatchObject({
      onboarding: true,
      step: 3,
    });
  });

  it("should return an error when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.patch("/user/learning-data"))
      .set("Authorization", `Bearer someToken`)
      .send({ data: { onboarding: true } });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });
});

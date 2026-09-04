import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Enum import
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

describe("E2E: UserProcessorController", () => {
  it("should list user processors", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const processor = await processorFactory.create({
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
    });

    const response = await context
      .userAuthorized(context.request.get("/processor"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: processor.id }),
        }),
      ]),
    );
  });

  it("should show a user processor", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const processor = await processorFactory.create({
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(context.request.get(`/processor/${processor.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: processor.id,
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
  });

  it("should return an error showing a processor that was not found", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.get(`/processor/${faker.string.uuid()}`))
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@processor_guard/PROCESSOR_NOT_FOUND",
    });
  });

  it("should return an error when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.get("/processor"))
      .set("Authorization", `Bearer someToken`)
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });
});

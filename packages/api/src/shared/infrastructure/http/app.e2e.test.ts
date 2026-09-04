import { describe, expect, it } from "vitest";

describe("E2E: App", () => {
  it("should answer an unknown route with a not found status", async context => {
    const response = await context.request.get("/unknown-route").send();

    expect(response.status).toBe(404);
  });

  it("should let a graphql request through the fallback handler", async context => {
    const response = await context.request
      .post("/graphql")
      .send({ query: "{ __typename }" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ __typename: "Query" });
  });
});

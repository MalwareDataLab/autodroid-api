import { describe, expect, it } from "vitest";

// Util import
import { gql } from "@/test/utils/gql.util";
import { createAuthorizedWorker } from "@/test/utils/workerAuth.util";

const WORKER_QUERY = gql`
  query Worker {
    worker {
      id
    }
  }
`;

const forbidden = (body: any) => {
  expect(body.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ extensions: { code: "FORBIDDEN" } }),
    ]),
  );
  expect(body.data).toBeNull();
};

describe("E2E: WorkerResolver", () => {
  it("should return the worker for a worker access token", async context => {
    const { worker, accessToken } = await createAuthorizedWorker();

    const response = await context.request
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ query: WORKER_QUERY });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.worker).toEqual(
      expect.objectContaining({ id: worker.id }),
    );
  });

  it("should forbid the worker query for a user access token", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: WORKER_QUERY });

    forbidden(response.body);
  });

  it("should forbid the worker query for an invalid worker access token", async context => {
    const response = await context.request
      .post("/graphql")
      .set("Authorization", "Bearer invalid-worker-access-token")
      .send({ query: WORKER_QUERY });

    forbidden(response.body);
  });

  it("should forbid the worker query when unauthenticated", async context => {
    const response = await context.request
      .post("/graphql")
      .send({ query: WORKER_QUERY });

    forbidden(response.body);
  });
});

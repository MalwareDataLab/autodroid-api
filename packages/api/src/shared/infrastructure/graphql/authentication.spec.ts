import { describe, expect, it } from "vitest";
import { AuthCheckerFn } from "type-graphql";

// Type import
import { GraphQLContext } from "./context";

// Handler import
import { authenticationHandler } from "./authentication";

const authChecker = authenticationHandler as AuthCheckerFn<GraphQLContext>;

const buildResolverData = (context: any): any => ({ context });

describe("GraphQL: authenticationHandler", () => {
  it("should authorize an @Authorized() with no roles when the user session has a user id", () => {
    const result = authChecker(
      buildResolverData({ user_session: { user: { id: "user-id" } } }),
      [],
    );

    expect(result).toBe(true);
  });

  it("should reject an @Authorized() with no roles when there is no user session", () => {
    const result = authChecker(
      buildResolverData({ user_session: undefined }),
      [],
    );

    expect(result).toBe(false);
  });

  it("should reject a role-guarded operation when there is no user session", () => {
    const result = authChecker(buildResolverData({ user_session: undefined }), [
      "ADMIN",
    ]);

    expect(result).toBe(false);
  });

  it("should authorize an admin role when the user session is admin", () => {
    const result = authChecker(
      buildResolverData({
        user_session: { user: { id: "user-id" }, is_admin: true },
      }),
      ["ADMIN"],
    );

    expect(result).toBe(true);
  });

  it("should authorize a worker role when the worker session has a worker id", () => {
    const result = authChecker(
      buildResolverData({
        user_session: { user: { id: "user-id" }, is_admin: false },
        worker_session: { worker: { id: "worker-id" } },
      }),
      ["WORKER"],
    );

    expect(result).toBe(true);
  });

  it("should reject when the requested roles are not satisfied", () => {
    const result = authChecker(
      buildResolverData({
        user_session: { user: { id: "user-id" }, is_admin: false },
        worker_session: undefined,
      }),
      ["ADMIN", "WORKER"],
    );

    expect(result).toBe(false);
  });
});

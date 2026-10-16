import { describe, expect, it } from "vitest";

// Util import
import { gql } from "@/test/utils/gql.util";

describe("E2E: AdminFileResolver", () => {
  it("should remove all dangling files for an admin", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminFileRemoveAllDangling {
            adminFileRemoveAllDangling
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(typeof response.body.data.adminFileRemoveAllDangling).toBe("number");
  });

  it("should forbid removing all dangling files for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminFileRemoveAllDangling {
            adminFileRemoveAllDangling
          }
        `,
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "FORBIDDEN" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });
});

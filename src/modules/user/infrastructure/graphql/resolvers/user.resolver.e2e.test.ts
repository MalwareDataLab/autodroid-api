import { describe, expect, it } from "vitest";
import request from "supertest";

describe("E2E: UserResolver", () => {
  it("should return user data", async context => {
    const response = await request(context.app.httpServer)
      .post("/graphql")
      .set("Authorization", `Bearer ${context.session.idToken}`)
      .send({
        query: `query User {
          user {
            name
            email
          }
        }`,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.user).toMatchObject({
      name: context.session.displayName,
      email: context.session.email,
    });
  });

  it("should return session data", async context => {
    const response = await request(context.app.httpServer)
      .post("/graphql")
      .set("Authorization", `Bearer ${context.session.idToken}`)
      .send({
        query: `query Session {
          session {
            user {
              name
              email
            }
          }
        }`,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.session.user).toMatchObject({
      name: context.session.displayName || null,
      email: context.session.email,
    });
  });

  it("should return an error if unauthorized", async context => {
    const response = await request(context.app.httpServer)
      .post("/graphql")
      .set("Authorization", `Bearer someToken`)
      .send({
        query: `query User {
          user {
            name
            email
          }
        }`,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Authentication error.",
          extensions: {
            code: "UNAUTHORIZED",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });
});

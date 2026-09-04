import { gql } from "@/test/utils/gql.util";
import { beforeEach, describe, expect, it } from "vitest";

// Provider import
import { IAuthenticationProvider } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";

describe("E2E: UserSessionResolver", () => {
  beforeEach(context => {
    const real = context.container.resolve<IAuthenticationProvider>(
      "AuthenticationProvider",
    );

    context.container.registerInstance<IAuthenticationProvider>(
      "AuthenticationProvider",
      {
        default_auth_provider: real.default_auth_provider,
        initialization: real.initialization,
        dispose: () => real.dispose(),
        getProvider: async (code, language) => {
          const provider = await real.getProvider(code, language);
          return new Proxy(provider, {
            get(target, prop, receiver) {
              if (prop === "revokeTokens") return async () => undefined;
              return Reflect.get(target, prop, receiver);
            },
          });
        },
      },
    );
  });

  it("should close user sessions", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation UserSessionsClose {
            userSessionsClose {
              id
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userSessionsClose).toMatchObject({
      id: expect.any(String),
    });
  });

  it("should return an error closing user sessions when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: gql`
          mutation UserSessionsClose {
            userSessionsClose {
              id
            }
          }
        `,
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "UNAUTHORIZED" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });
});

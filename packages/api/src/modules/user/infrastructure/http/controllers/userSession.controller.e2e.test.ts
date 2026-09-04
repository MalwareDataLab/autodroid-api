import { beforeEach, describe, expect, it } from "vitest";

// Provider import
import { IAuthenticationProvider } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";

describe("E2E: UserSessionController", () => {
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

  it("should return session data", async context => {
    const response = await context
      .userAuthorized(context.request.get("/user/session"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: context.userSession.email,
    });
  });

  it("should close user sessions", async context => {
    const response = await context
      .userAuthorized(context.request.delete("/user/session"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: expect.any(String) });
  });

  it("should return an error when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.get("/user/session"))
      .set("Authorization", `Bearer someToken`)
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });
});

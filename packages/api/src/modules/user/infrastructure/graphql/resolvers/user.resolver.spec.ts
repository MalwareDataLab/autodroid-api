import { beforeEach, describe, expect, it } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";

// Target import
import { UserResolver } from "./user.resolver";

describe("Resolver: UserResolver", () => {
  const user = userFactory.build();

  const session = { user, is_admin: false } as Session;

  const graphQLContext = {
    user_session: session,
    language: "en",
  } as GraphQLContext;

  let userResolver: UserResolver;

  beforeEach(() => {
    userResolver = new UserResolver();
  });

  it("should return the user of the context session", async () => {
    const result = await userResolver.user(graphQLContext);

    expect(result).toBe(user);
  });

  it("should return undefined when the context has no user session", async () => {
    const result = await userResolver.user({} as GraphQLContext);

    expect(result).toBeUndefined();
  });

  it("should return the whole context session", async () => {
    const result = await userResolver.session(graphQLContext);

    expect(result).toBe(session);
  });

  it("should return undefined session when the context has no user session", async () => {
    const result = await userResolver.session({} as GraphQLContext);

    expect(result).toBeUndefined();
  });
});

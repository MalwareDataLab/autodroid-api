import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Entity import
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { UserSessionsCloseService } from "@modules/user/services/userSessionsClose.service";

// Target import
import { UserSessionResolver } from "./userSession.resolver";

describe("Resolver: UserSessionResolver", () => {
  const user = userFactory.build();

  const userAuthProviderConn = {
    id: "8f14d2b0-0000-4000-8000-000000000000",
  } as UserAuthProviderConn;

  const graphQLContext = {
    user_session: { user, user_auth_provider_conn: userAuthProviderConn },
    language: "en",
  } as GraphQLContext;

  let userSessionsCloseService: { execute: ReturnType<typeof vi.fn> };

  let userSessionResolver: UserSessionResolver;

  beforeEach(() => {
    userSessionsCloseService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserSessionsCloseService) return userSessionsCloseService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userSessionResolver = new UserSessionResolver();
  });

  it("should close the sessions and return the context auth provider connection", async () => {
    userSessionsCloseService.execute.mockResolvedValueOnce(undefined);

    const result = await userSessionResolver.userSessionsClose(graphQLContext);

    expect(userSessionsCloseService.execute).toHaveBeenCalledWith({
      user,
      language: "en",
    });
    expect(result).toBe(userAuthProviderConn);
  });

  it("should propagate a failure closing the sessions", async () => {
    const error = new Error("close failed");
    userSessionsCloseService.execute.mockRejectedValueOnce(error);

    await expect(
      userSessionResolver.userSessionsClose(graphQLContext),
    ).rejects.toThrowError(error);
  });
});

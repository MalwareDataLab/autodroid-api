import { describe, expect, it } from "vitest";

// Util import
import { createDisposableFirebaseSession } from "@/test/utils/createDisposableFirebaseSession.util";
import { gql } from "@/test/utils/gql.util";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Factory import
import { mcpAuthorizationGrantFactory } from "@modules/mcpAuthorization/entities/factories/mcpAuthorizationGrant.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

describe("E2E: UserSessionResolver", () => {
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

  it("should close user sessions", async context => {
    const disposable = await createDisposableFirebaseSession(
      context.container,
      "Session Owner",
    );

    try {
      const user = await userFactory.create({
        email: disposable.session.email,
      });
      const otherUser = await userFactory.create();
      const grant = await mcpAuthorizationGrantFactory.create({
        user_id: user.id,
      });
      const otherUserGrant = await mcpAuthorizationGrantFactory.create({
        user_id: otherUser.id,
      });
      const authorization = `Bearer ${disposable.session.idToken}`;
      await new Promise(resolve => {
        setTimeout(resolve, 1100);
      });

      const response = await context.request
        .post("/graphql")
        .set("Authorization", authorization)
        .send({
          query: gql`
            mutation UserSessionsClose {
              userSessionsClose {
                id
              }
            }
          `,
        });

      const userAuthProviderConn =
        await context.repositories.UserAuthProviderConnRepository.findOne({
          user_id: user.id,
          auth_provider: AUTH_PROVIDER.FIREBASE,
        });
      expect(userAuthProviderConn).toMatchObject({
        code: disposable.session.localId,
      });
      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.userSessionsClose).toEqual({
        id: userAuthProviderConn!.id,
      });
      await expect(
        context.repositories.McpAuthorizationGrantRepository.findOne({
          id: grant.id,
        }),
      ).resolves.toEqual(
        expect.objectContaining({ revoked_at: expect.any(Date) }),
      );
      await expect(
        context.repositories.McpAuthorizationGrantRepository.findOne({
          id: otherUserGrant.id,
        }),
      ).resolves.toEqual(expect.objectContaining({ revoked_at: null }));
      const sessionAfterClose = await context.request
        .get("/user/session")
        .set("Authorization", authorization)
        .send();
      expect(sessionAfterClose.status).toBe(401);
    } finally {
      await disposable.dispose();
    }
  });
});

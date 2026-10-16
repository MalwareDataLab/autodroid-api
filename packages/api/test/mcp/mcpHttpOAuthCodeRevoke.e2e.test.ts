import { describe, expect, it } from "vitest";

// Util import
import {
  ALL_SCOPES,
  completeAuthorization,
  exchangeCodeForTokens,
  extractRequestId,
  makePkcePair,
  startAuthorization,
} from "@/test/utils/mcpOAuthFlow.util";

// Type import
import type { TestContext } from "@/test/types/testContext.type";

const connectionIdOf = async (context: TestContext, client_id: string) =>
  (
    await context.userAuthorized(context.request.post("/graphql")).send({
      query: `query { userMcpAuthorizationGrants { id client_id } }`,
    })
  ).body.data.userMcpAuthorizationGrants.find(
    (connection: { client_id: string }) => connection.client_id === client_id,
  )?.id as string | undefined;

const approveAuthorization = async (
  context: TestContext,
  client_id: string,
  challenge: string,
) => {
  const request_id = extractRequestId(
    (await startAuthorization(context, client_id, challenge, ALL_SCOPES))
      .headers.location,
  );
  await context.userAuthorized(context.request.get(`/mcp-auth/${request_id}`));
  const decisionResponse = await context
    .userAuthorized(context.request.post(`/mcp-auth/${request_id}/decision`))
    .send({ approve: true });

  return new URL(decisionResponse.body.redirect_to).searchParams.get("code")!;
};

describe("E2E: MCP OAuth authorization code approved before a disconnect", () => {
  it("should refuse a code approved before the user disconnected the app, and keep the app disconnected", async context => {
    const beforeDisconnect = await completeAuthorization(context);
    const connectionId = (await connectionIdOf(
      context,
      beforeDisconnect.client_id,
    ))!;
    const { verifier, challenge } = makePkcePair();
    const code = await approveAuthorization(
      context,
      beforeDisconnect.client_id,
      challenge,
    );
    const disconnectResponse = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: `mutation($id: String!) { userMcpAuthorizationGrantRevoke(mcp_authorization_grant_id: $id) { id } }`,
        variables: { id: connectionId },
      });
    expect(disconnectResponse.body.errors).toBeUndefined();

    const exchangeResponse = await exchangeCodeForTokens(context, {
      code,
      client_id: beforeDisconnect.client_id,
      verifier,
    });

    expect(exchangeResponse.status).toBe(400);
    expect(exchangeResponse.body).toEqual({
      error: "invalid_grant",
      error_description:
        "This authorization code was approved before its connection was revoked.",
    });
    expect(
      await connectionIdOf(context, beforeDisconnect.client_id),
    ).toBeUndefined();
    expect(
      (
        await context.request
          .post("/mcp")
          .set("Authorization", `Bearer ${beforeDisconnect.access_token}`)
          .set("Accept", "application/json, text/event-stream")
          .send({ jsonrpc: "2.0", id: 1, method: "tools/list" })
      ).status,
    ).toBe(401);
  });
});

import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

// Util import
import {
  ALL_SCOPES,
  REDIRECT_URI,
  authorizeClient,
  callTool,
  completeAuthorization,
  exchangeCodeForTokens,
  extractRequestId,
  makePkcePair,
  parseToolResult,
  registerClient,
  startAuthorization,
} from "@/test/utils/mcpOAuthFlow.util";
import { mcpToolNamesOf } from "@/test/utils/mcpToolContract.util";

// Constant import
import { MCP_TAKE_DEFAULT } from "@modules/mcp/constants/mcp.constant";

// Type import
import type { TestContext } from "@/test/types/testContext.type";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

const listConnections = async (context: TestContext) =>
  (
    await context.userAuthorized(context.request.post("/graphql")).send({
      query: `query { userMcpAuthorizationGrants { id client_id client_name client_verified_host scopes last_used_at } }`,
    })
  ).body.data.userMcpAuthorizationGrants as {
    id: string;
    client_id: string;
    client_name: string | null;
    client_verified_host: string | null;
    scopes: string[];
    last_used_at: string | null;
  }[];

const connectionsOf = async (context: TestContext, client_id: string) =>
  (await listConnections(context)).filter(
    connection => connection.client_id === client_id,
  );

const revokeConnection = (context: TestContext, connectionId: string) =>
  context.userAuthorized(context.request.post("/graphql")).send({
    query: `mutation($id: String!) { userMcpAuthorizationGrantRevoke(mcp_authorization_grant_id: $id) { id } }`,
    variables: { id: connectionId },
  });

const refreshTokens = (
  context: TestContext,
  client_id: string,
  refresh_token: string,
  scope?: string,
) =>
  context.request
    .post("/oauth/token")
    .type("form")
    .send({
      grant_type: "refresh_token",
      refresh_token,
      client_id,
      ...(scope && { scope }),
    });

const callMcp = (context: TestContext, access_token: string) =>
  context.request
    .post("/mcp")
    .set("Authorization", `Bearer ${access_token}`)
    .set("Accept", "application/json, text/event-stream")
    .send({ jsonrpc: "2.0", id: 9, method: "tools/list" });

const NON_ADMIN_TOOL_NAMES = mcpToolNamesOf("user");

const ADMIN_TOOL_NAMES = mcpToolNamesOf("admin");

const makeProcessorDefinition = (imageTag: string) => ({
  name: "Example Processor",
  version: "1.0.0",
  image_tag: imageTag,
  description: null,
  tags: null,
  allowed_mime_types: "text/csv",
  visibility: "HIDDEN",
  configuration: {
    command: "run",
    dataset_input_argument: "-i",
    dataset_input_value: "input",
    dataset_output_argument: "-o",
    dataset_output_value: "output",
    output_metrics_file_glob_patterns: ["*"],
    output_result_file_glob_patterns: ["*"],
    parameters: [
      {
        sequence: 1,
        name: "threshold",
        description: "Detection threshold",
        type: "STRING",
        is_required: false,
        default_value: null,
      },
    ],
  },
});

describe("E2E: remote MCP OAuth + Streamable HTTP endpoint", () => {
  it("should serve authorization server metadata advertising CIMD and S256", async context => {
    const response = await context.request.get(
      "/.well-known/oauth-authorization-server",
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      revocation_endpoint_auth_methods_supported: ["none"],
      client_id_metadata_document_supported: true,
      grant_types_supported: ["authorization_code", "refresh_token"],
    });
  });

  it("should reject an unauthenticated /mcp call with a 401 pointing at the protected resource metadata", async context => {
    const response = await context.request.post("/mcp").send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
    });

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toContain(
      "resource_metadata=",
    );
    expect(response.headers["www-authenticate"]).toContain(
      'scope="autodroid:read autodroid:write"',
    );
    expect(response.headers["www-authenticate"]).not.toContain("error=");
  });

  it("should reject a real Firebase idToken as an /mcp Bearer token (audience separation)", async context => {
    const response = await context.request
      .post("/mcp")
      .set("Authorization", `Bearer ${context.userSession.idToken}`)
      .send({ jsonrpc: "2.0", id: 1, method: "initialize" });

    expect(response.status).toBe(401);
  });

  it("should complete the full DCR authorization_code round trip and let the minted token call an MCP tool", async context => {
    const { verifier, challenge } = makePkcePair();

    const registerResponse = await registerClient(context);
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.client_id).toMatch(/^mcpc1\./);
    expect(registerResponse.body.client_secret).toBeUndefined();
    const { client_id } = registerResponse.body;

    const authorizeResponse = await startAuthorization(
      context,
      client_id,
      challenge,
    );
    expect(authorizeResponse.status).toBe(302);
    const request_id = extractRequestId(authorizeResponse.headers.location);

    const showResponse = await context
      .userAuthorized(context.request.get(`/mcp-auth/${request_id}`))
      .send();
    expect(showResponse.status).toBe(200);
    expect(showResponse.body).toStrictEqual({
      scopes: ["autodroid:read", "autodroid:write"],
      client_name: "Test MCP Client",
      redirect_uri: REDIRECT_URI,
      redirect_host: "client.example.com",
      only_loopback_redirects: false,
    });

    const decisionResponse = await context
      .userAuthorized(context.request.post(`/mcp-auth/${request_id}/decision`))
      .send({ approve: true });
    expect(decisionResponse.status).toBe(200);
    const redirectTo = new URL(decisionResponse.body.redirect_to);
    expect(redirectTo.origin + redirectTo.pathname).toBe(REDIRECT_URI);
    const code = redirectTo.searchParams.get("code")!;
    expect(code).toBeTruthy();

    const tokenResponse = await exchangeCodeForTokens(context, {
      code,
      client_id,
      verifier,
    });
    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.token_type).toBe("Bearer");
    const { access_token, refresh_token } = tokenResponse.body;
    expect(access_token).toBeTruthy();
    expect(refresh_token).toBeTruthy();

    const initializeResponse = await context.request
      .post("/mcp")
      .set("Authorization", `Bearer ${access_token}`)
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "e2e-test-client", version: "1.0.0" },
        },
      });
    expect(initializeResponse.status).toBe(200);

    const toolsListResponse = await context.request
      .post("/mcp")
      .set("Authorization", `Bearer ${access_token}`)
      .set("Accept", "application/json, text/event-stream")
      .send({ jsonrpc: "2.0", id: 1, method: "tools/list" });

    expect(toolsListResponse.status).toBe(200);
    const toolNames = toolsListResponse.body.result.tools.map(
      (tool: { name: string }) => tool.name,
    );
    expect(toolNames).toEqual(NON_ADMIN_TOOL_NAMES);

    const whoamiResponse = await context.request
      .post("/mcp")
      .set("Authorization", `Bearer ${access_token}`)
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "autodroid_whoami", arguments: {} },
      });

    expect(whoamiResponse.status).toBe(200);
    expect(whoamiResponse.body.result.isError).not.toBe(true);
    const whoamiPayload = JSON.parse(
      whoamiResponse.body.result.content[0].text,
    );
    expect(whoamiPayload.email).toBe(context.userSession.email);

    const reusedCodeResponse = await exchangeCodeForTokens(context, {
      code,
      client_id,
      verifier,
    });
    expect(reusedCodeResponse.status).toBe(400);
    expect(reusedCodeResponse.body.error).toBe("invalid_grant");

    const refreshResponse = await context.request
      .post("/oauth/token")
      .type("form")
      .send({
        grant_type: "refresh_token",
        refresh_token,
        client_id,
      });
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.access_token).not.toBe(access_token);
    expect(refreshResponse.body.refresh_token).not.toBe(refresh_token);

    const { access_token: secondAccessToken } = refreshResponse.body;
    const revokeResponse = await context.request
      .post("/oauth/revoke")
      .type("form")
      .send({ token: secondAccessToken, client_id });
    expect(revokeResponse.status).toBe(200);

    const revokedTokenResponse = await context.request
      .post("/mcp")
      .set("Authorization", `Bearer ${secondAccessToken}`)
      .set("Accept", "application/json, text/event-stream")
      .send({ jsonrpc: "2.0", id: 3, method: "tools/list" });
    expect(revokedTokenResponse.status).toBe(401);

    const reusedRefreshResponse = await context.request
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "refresh_token", refresh_token, client_id });
    expect(reusedRefreshResponse.status).toBe(400);
    expect(reusedRefreshResponse.body.error).toBe("invalid_grant");
  });

  it("should only include the 27 admin tools in tools/list, and let a real admin tool call succeed, when the approving user is an admin", async context => {
    const { verifier, challenge } = makePkcePair();

    const registerResponse = await registerClient(context);
    expect(registerResponse.status).toBe(201);
    const { client_id } = registerResponse.body;

    const authorizeResponse = await startAuthorization(
      context,
      client_id,
      challenge,
      ALL_SCOPES,
    );
    expect(authorizeResponse.status).toBe(302);
    const request_id = extractRequestId(authorizeResponse.headers.location);

    await context
      .adminAuthorized(context.request.get(`/mcp-auth/${request_id}`))
      .send();

    const decisionResponse = await context
      .adminAuthorized(context.request.post(`/mcp-auth/${request_id}/decision`))
      .send({ approve: true });
    expect(decisionResponse.status).toBe(200);
    const redirectTo = new URL(decisionResponse.body.redirect_to);
    const code = redirectTo.searchParams.get("code")!;

    const tokenResponse = await exchangeCodeForTokens(context, {
      code,
      client_id,
      verifier,
    });
    expect(tokenResponse.status).toBe(200);
    const { access_token } = tokenResponse.body;

    await context.request
      .post("/mcp")
      .set("Authorization", `Bearer ${access_token}`)
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "e2e-test-client", version: "1.0.0" },
        },
      });

    const toolsListResponse = await context.request
      .post("/mcp")
      .set("Authorization", `Bearer ${access_token}`)
      .set("Accept", "application/json, text/event-stream")
      .send({ jsonrpc: "2.0", id: 1, method: "tools/list" });

    expect(toolsListResponse.status).toBe(200);
    const toolNames = toolsListResponse.body.result.tools.map(
      (tool: { name: string }) => tool.name,
    );
    expect(toolNames).toEqual([...NON_ADMIN_TOOL_NAMES, ...ADMIN_TOOL_NAMES]);
    expect(toolNames).toHaveLength(53);

    const adminListDatasetsResponse = await context.request
      .post("/mcp")
      .set("Authorization", `Bearer ${access_token}`)
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "autodroid_admin_list_datasets", arguments: {} },
      });

    expect(adminListDatasetsResponse.status).toBe(200);
    expect(adminListDatasetsResponse.body.result.isError).not.toBe(true);
    const adminDatasetsPayload = JSON.parse(
      adminListDatasetsResponse.body.result.content[0].text,
    );
    expect(adminDatasetsPayload).toEqual({
      items: [],
      total_count: 0,
      has_next_page: false,
    });
  });

  it("should redirect with access_denied when the user denies the request", async context => {
    const { challenge } = makePkcePair();

    const registerResponse = await registerClient(context);
    expect(registerResponse.status).toBe(201);
    const { client_id } = registerResponse.body;

    const authorizeResponse = await startAuthorization(
      context,
      client_id,
      challenge,
    );
    expect(authorizeResponse.status).toBe(302);
    const request_id = extractRequestId(authorizeResponse.headers.location);

    await context
      .userAuthorized(context.request.get(`/mcp-auth/${request_id}`))
      .send();

    const decisionResponse = await context
      .userAuthorized(context.request.post(`/mcp-auth/${request_id}/decision`))
      .send({ approve: false });

    expect(decisionResponse.status).toBe(200);
    const redirectTo = new URL(decisionResponse.body.redirect_to);
    expect(redirectTo.searchParams.get("error")).toBe("access_denied");
  });

  it("should reject a decision made before the request's details were ever shown", async context => {
    const { challenge } = makePkcePair();

    const registerResponse = await registerClient(context);
    expect(registerResponse.status).toBe(201);
    const { client_id } = registerResponse.body;

    const authorizeResponse = await startAuthorization(
      context,
      client_id,
      challenge,
    );
    expect(authorizeResponse.status).toBe(302);
    const request_id = extractRequestId(authorizeResponse.headers.location);

    const decisionResponse = await context
      .userAuthorized(context.request.post(`/mcp-auth/${request_id}/decision`))
      .send({ approve: true });

    expect(decisionResponse.status).toBe(409);
  });

  it("should answer a malformed authorization request directly instead of redirecting to the client's redirect_uri before any user has authenticated", async context => {
    const registerResponse = await registerClient(context);
    const { client_id } = registerResponse.body;

    const response = await context.request.get("/oauth/authorize").query({
      response_type: "code",
      client_id,
      redirect_uri: REDIRECT_URI,
    });

    expect(response.status).toBe(400);
    expect(response.headers.location).toBeUndefined();
    expect(response.body).toMatchObject({ error: "invalid_request" });
  });

  it("should give a client that registers again from another loopback port the same client_id, and authorize it from any port but not another path", async context => {
    const { challenge } = makePkcePair();
    const authorizeFrom = (client_id: string, redirect_uri: string) =>
      context.request.get("/oauth/authorize").query({
        response_type: "code",
        client_id,
        code_challenge: challenge,
        code_challenge_method: "S256",
        redirect_uri,
      });

    const first = await registerClient(context, {
      redirect_uris: ["http://127.0.0.1:33418/callback"],
    });
    const second = await registerClient(context, {
      redirect_uris: ["http://127.0.0.1:47021/callback"],
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.client_id).toBe(first.body.client_id);
    expect(second.body.redirect_uris).toEqual([
      "http://127.0.0.1:47021/callback",
    ]);
    const fromAnotherPort = await authorizeFrom(
      second.body.client_id,
      "http://127.0.0.1:51999/callback",
    );
    expect(fromAnotherPort.status).toBe(302);
    expect(extractRequestId(fromAnotherPort.headers.location)).toEqual(
      expect.any(String),
    );
    const fromAnotherPath = await authorizeFrom(
      second.body.client_id,
      "http://127.0.0.1:51999/elsewhere",
    );
    expect(fromAnotherPath.status).toBe(400);
    expect(fromAnotherPath.headers.location).toBeUndefined();
  });

  it("should serve protected resource metadata only where the resource identifier matches the well-known path", async context => {
    const scoped = await context.request.get(
      "/.well-known/oauth-protected-resource/mcp",
    );
    const bare = await context.request.get(
      "/.well-known/oauth-protected-resource",
    );

    expect(scoped.status).toBe(200);
    expect(scoped.body.authorization_servers).toHaveLength(1);
    expect(new URL(scoped.body.resource).pathname).toBe("/mcp");
    expect(bare.status).toBe(404);
  });

  it("should list the app the user just authorized under their connections, with the name it declared marked unverified and the scopes it holds", async context => {
    const { client_id } = await completeAuthorization(context);

    const connections = await listConnections(context);

    expect(connections).toContainEqual({
      id: expect.any(String),
      client_id,
      client_name: "Test MCP Client",
      client_verified_host: null,
      scopes: ["autodroid:read", "autodroid:write"],
      last_used_at: expect.any(String),
    });
  });

  it("should keep one connection, under the same id, when the same client authorizes again, leaving both token pairs working", async context => {
    const first = await completeAuthorization(context);
    const [connection] = await connectionsOf(context, first.client_id);

    const second = await authorizeClient(context, first.client_id);

    expect(await connectionsOf(context, first.client_id)).toEqual([
      expect.objectContaining({ id: connection.id }),
    ]);
    expect((await callMcp(context, first.access_token)).status).toBe(200);
    expect((await callMcp(context, second.access_token)).status).toBe(200);
  });

  it("should list one connection per client when two different clients are authorized", async context => {
    const first = await completeAuthorization(context);
    const { client_id: secondClientId } = (
      await registerClient(context, { client_name: "Second MCP Client" })
    ).body;
    const second = await authorizeClient(context, secondClientId);

    const [firstConnections, secondConnections] = await Promise.all([
      connectionsOf(context, first.client_id),
      connectionsOf(context, second.client_id),
    ]);

    expect(firstConnections).toHaveLength(1);
    expect(secondConnections).toHaveLength(1);
    expect(firstConnections[0].id).not.toBe(secondConnections[0].id);
  });

  it("should bring a disconnected app back under the same connection when it authorizes again, without reviving the tokens the disconnect ended", async context => {
    const beforeDisconnect = await completeAuthorization(context);
    const [connection] = await connectionsOf(
      context,
      beforeDisconnect.client_id,
    );
    expect(
      (await revokeConnection(context, connection.id)).body.errors,
    ).toBeUndefined();
    expect(await connectionsOf(context, beforeDisconnect.client_id)).toEqual(
      [],
    );

    const afterReconnect = await authorizeClient(
      context,
      beforeDisconnect.client_id,
    );

    expect(await connectionsOf(context, beforeDisconnect.client_id)).toEqual([
      expect.objectContaining({ id: connection.id }),
    ]);
    expect((await callMcp(context, afterReconnect.access_token)).status).toBe(
      200,
    );
    expect((await callMcp(context, beforeDisconnect.access_token)).status).toBe(
      401,
    );
    const staleRefresh = await refreshTokens(
      context,
      beforeDisconnect.client_id,
      beforeDisconnect.refresh_token,
    );
    expect(staleRefresh.status).toBe(400);
    expect(staleRefresh.body.error).toBe("invalid_grant");
    const freshRefresh = await refreshTokens(
      context,
      afterReconnect.client_id,
      afterReconnect.refresh_token,
    );
    expect(freshRefresh.status).toBe(200);
    expect(await connectionsOf(context, beforeDisconnect.client_id)).toEqual([
      expect.objectContaining({ id: connection.id }),
    ]);
  });

  it("should cut a live access token at once, and refuse its refresh token, when the user revokes the connection", async context => {
    const { client_id, access_token, refresh_token } =
      await completeAuthorization(context);
    expect((await callMcp(context, access_token)).status).toBe(200);
    const connection = (await listConnections(context)).find(
      candidate => candidate.client_id === client_id,
    )!;

    const revokeResponse = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: `mutation($id: String!) { userMcpAuthorizationGrantRevoke(mcp_authorization_grant_id: $id) { id } }`,
        variables: { id: connection.id },
      });
    expect(revokeResponse.body.errors).toBeUndefined();

    expect((await callMcp(context, access_token)).status).toBe(401);
    const refreshResponse = await context.request
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "refresh_token", refresh_token, client_id });
    expect(refreshResponse.status).toBe(400);
    expect(refreshResponse.body.error).toBe("invalid_grant");
    expect(await listConnections(context)).not.toContainEqual(
      expect.objectContaining({ client_id }),
    );
  });

  it("should end the whole grant, live access token included, when the client revokes its refresh token (RFC 7009)", async context => {
    const { client_id, access_token, refresh_token } =
      await completeAuthorization(context);
    expect((await callMcp(context, access_token)).status).toBe(200);

    const revokeResponse = await context.request
      .post("/oauth/revoke")
      .type("form")
      .send({ token: refresh_token, client_id });
    expect(revokeResponse.status).toBe(200);

    expect((await callMcp(context, access_token)).status).toBe(401);
    expect(await listConnections(context)).not.toContainEqual(
      expect.objectContaining({ client_id }),
    );
  });

  it("should end the connection, rotated tokens included, when an already-rotated refresh token is replayed", async context => {
    const { client_id, refresh_token } = await completeAuthorization(context);
    const rotatedResponse = await context.request
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "refresh_token", refresh_token, client_id });
    expect(rotatedResponse.status).toBe(200);
    const rotated = rotatedResponse.body;
    expect((await callMcp(context, rotated.access_token)).status).toBe(200);

    const replayResponse = await context.request
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "refresh_token", refresh_token, client_id });

    expect(replayResponse.status).toBe(400);
    expect(replayResponse.body.error).toBe("invalid_grant");
    expect((await callMcp(context, rotated.access_token)).status).toBe(401);
    const rotatedRefreshResponse = await context.request
      .post("/oauth/token")
      .type("form")
      .send({
        grant_type: "refresh_token",
        refresh_token: rotated.refresh_token,
        client_id,
      });
    expect(rotatedRefreshResponse.status).toBe(400);
    expect(rotatedRefreshResponse.body.error).toBe("invalid_grant");
    expect(await listConnections(context)).not.toContainEqual(
      expect.objectContaining({ client_id }),
    );
  });

  it("should send the user's own profile values through the update tool and get the stored profile back", async context => {
    const { access_token } = await completeAuthorization(context);
    const currentResponse = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: `query { user { name language notifications_enabled } }`,
      });
    const current = currentResponse.body.data.user;

    const updateResult = await callTool(
      context,
      access_token,
      "autodroid_update_profile",
      {
        data: {
          name: current.name,
          ...(current.language !== null && { language: current.language }),
          ...(current.notifications_enabled !== null && {
            notifications_enabled: current.notifications_enabled,
          }),
        },
      },
    );

    expect(updateResult.isError).not.toBe(true);
    expect(parseToolResult(updateResult)).toEqual({
      id: expect.any(String),
      name: current.name,
      email: context.userSession.email,
      is_admin: false,
      language: current.language,
    });
  });

  it("should reject an invalid profile update with the schema's own message", async context => {
    const { access_token } = await completeAuthorization(context);

    const updateResult = await callTool(
      context,
      access_token,
      "autodroid_update_profile",
      { data: { name: "R2-D2 #1" } },
    );

    expect(updateResult).toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "MCP error -32602: Input validation error: Invalid arguments for tool autodroid_update_profile: name should contain only letters and spaces at data.name",
        },
      ],
    });
  });

  it("should page an admin list tool by the API's default size and sort it as asked", async context => {
    const tokens = await Promise.all(
      Array.from({ length: MCP_TAKE_DEFAULT + 1 }, (_, index) =>
        workerRegistrationTokenFactory.create({
          created_at: new Date(Date.UTC(2026, 0, index + 1)),
        }),
      ),
    );
    const { access_token } = await completeAuthorization(
      context,
      context.adminAuthorized,
    );

    const defaultPage = parseToolResult(
      await callTool(
        context,
        access_token,
        "autodroid_admin_list_worker_registration_tokens",
      ),
    );
    const oldestFirst = parseToolResult(
      await callTool(
        context,
        access_token,
        "autodroid_admin_list_worker_registration_tokens",
        { take: 3, sorting: [{ field: "created_at", order: "ASC" }] },
      ),
    );

    expect(defaultPage.items).toHaveLength(MCP_TAKE_DEFAULT);
    expect(defaultPage.items.map((token: { id: string }) => token.id)).toEqual(
      tokens
        .slice(1)
        .reverse()
        .map(token => token.id),
    );
    expect(defaultPage.total_count).toBe(MCP_TAKE_DEFAULT + 1);
    expect(defaultPage.has_next_page).toBe(true);
    expect(oldestFirst.items.map((token: { id: string }) => token.id)).toEqual(
      tokens.slice(0, 3).map(token => token.id),
    );
    expect(oldestFirst.total_count).toBe(MCP_TAKE_DEFAULT + 1);
    expect(oldestFirst.has_next_page).toBe(true);
  });

  it("should filter an admin list tool by an argument only GraphQL offered before, and never return the token values", async context => {
    const [wanted] = await Promise.all([
      workerRegistrationTokenFactory.create(),
      workerRegistrationTokenFactory.create(),
    ]);
    const { access_token } = await completeAuthorization(
      context,
      context.adminAuthorized,
    );

    const result = await callTool(
      context,
      access_token,
      "autodroid_admin_list_worker_registration_tokens",
      { token: wanted.token },
    );

    expect(result.isError).not.toBe(true);
    expect(parseToolResult(result)).toEqual({
      items: [
        {
          id: wanted.id,
          is_unlimited_usage: false,
          expires_at: null,
          created_at: wanted.created_at.toISOString(),
        },
      ],
      total_count: 1,
      has_next_page: false,
    });
  });

  it("should refuse a list tool sorting by one field twice, as the GraphQL API does", async context => {
    const { access_token } = await completeAuthorization(
      context,
      context.adminAuthorized,
    );

    const result = await callTool(
      context,
      access_token,
      "autodroid_admin_list_worker_registration_tokens",
      {
        sorting: [
          { field: "id", order: "ASC" },
          { field: "id", order: "DESC" },
        ],
      },
    );

    expect(result).toEqual({
      isError: true,
      content: [{ type: "text", text: "Duplicated sorting fields: id." }],
    });
  });

  it("should answer GET and DELETE on /mcp with 405 and the one method it allows", async context => {
    const getResponse = await context.request.get("/mcp");
    const deleteResponse = await context.request.delete("/mcp");

    expect(getResponse.status).toBe(405);
    expect(getResponse.headers.allow).toBe("POST");
    expect(deleteResponse.status).toBe(405);
    expect(deleteResponse.headers.allow).toBe("POST");
  });

  it("should answer a body in a charset it cannot read with a 415, not a server error", async context => {
    const response = await context.request
      .post("/mcp")
      .set("Content-Type", "application/json; charset=latin1")
      .send('{"jsonrpc":"2.0","id":1,"method":"tools/list"}');

    expect(response.status).toBe(415);
    expect(response.body).toEqual({
      code: "@general/INVALID_REQUEST",
      message: expect.stringContaining("unsupported charset"),
    });
  });

  it("should refuse a batch of tool calls in one request, so the rate limit counts every call", async context => {
    const { access_token } = await completeAuthorization(context);

    const response = await context.request
      .post("/mcp")
      .set("Authorization", `Bearer ${access_token}`)
      .set("Accept", "application/json, text/event-stream")
      .send([
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { jsonrpc: "2.0", id: 2, method: "tools/list" },
      ]);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Batch requests are not supported." },
    });
  });

  describe("scopes", () => {
    const probeName = `Probe ${[...randomBytes(8)]
      .map(byte => String.fromCharCode(97 + (byte % 26)))
      .join("")}`;

    const listedToolNames = async (context: TestContext, token: string) =>
      (await callMcp(context, token)).body.result.tools.map(
        ({ name }: { name: string }) => name,
      );

    const callToolRaw = (
      context: TestContext,
      access_token: string,
      name: string,
      toolArguments: Record<string, unknown> = {},
    ) =>
      context.request
        .post("/mcp")
        .set("Authorization", `Bearer ${access_token}`)
        .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 11,
          method: "tools/call",
          params: { name, arguments: toolArguments },
        });

    it("should advertise the scopes it supports in both discovery documents", async context => {
      const authorizationServer = await context.request.get(
        "/.well-known/oauth-authorization-server",
      );
      const protectedResource = await context.request.get(
        "/.well-known/oauth-protected-resource/mcp",
      );

      const supported = [
        "autodroid:read",
        "autodroid:write",
        "autodroid:admin",
      ];
      expect(authorizationServer.body.scopes_supported).toEqual(supported);
      expect(protectedResource.body.scopes_supported).toEqual(supported);
    });

    it("should grant an administrator the read and write scopes, never admin, when the client asks for none", async context => {
      const { access_token, scope } = await completeAuthorization(
        context,
        context.adminAuthorized,
        "",
      );

      expect(scope).toBe("autodroid:read autodroid:write");
      const response = await callToolRaw(
        context,
        access_token,
        "autodroid_admin_list_workers",
      );
      expect(response.status).toBe(403);
      expect(response.headers["www-authenticate"]).toContain(
        'scope="autodroid:read autodroid:write autodroid:admin"',
      );
    });

    it("should leave the admin scope out for a person who is not an administrator, and say so in the token response", async context => {
      const { scope, access_token } = await completeAuthorization(context);

      expect(scope).toBe("autodroid:read autodroid:write");
      expect(await listedToolNames(context, access_token)).toEqual(
        mcpToolNamesOf("user"),
      );
    });

    it("should list every user tool to a read-only token and answer a write call with a 403 asking for the scopes it holds plus the one it lacks, changing nothing", async context => {
      const { access_token, scope } = await completeAuthorization(
        context,
        context.userAuthorized,
        "autodroid:read",
      );

      expect(scope).toBe("autodroid:read");
      expect(await listedToolNames(context, access_token)).toEqual(
        mcpToolNamesOf("user"),
      );
      const response = await callToolRaw(
        context,
        access_token,
        "autodroid_update_profile",
        { name: probeName },
      );

      expect(response.status).toBe(403);
      expect(response.headers["www-authenticate"]).toContain(
        'error="insufficient_scope", scope="autodroid:read autodroid:write"',
      );
      expect(response.headers["www-authenticate"]).toContain(
        "resource_metadata=",
      );
      expect(response.body.error).toBe("insufficient_scope");
      const profile = await context
        .userAuthorized(context.request.post("/graphql"))
        .send({ query: `query { user { name } }` });
      expect(profile.body.data.user.name).not.toBe(probeName);
    });

    it("should hold the tokens of an earlier authorization to the scopes the latest one granted, as the connection lists them", async context => {
      const readWrite = await completeAuthorization(
        context,
        context.userAuthorized,
        "autodroid:read autodroid:write",
      );

      const readOnly = await authorizeClient(
        context,
        readWrite.client_id,
        context.userAuthorized,
        "autodroid:read",
      );

      expect(readOnly.scope).toBe("autodroid:read");
      expect(await connectionsOf(context, readWrite.client_id)).toEqual([
        expect.objectContaining({ scopes: ["autodroid:read"] }),
      ]);
      const writeWithEarlierToken = await callToolRaw(
        context,
        readWrite.access_token,
        "autodroid_update_profile",
        { name: probeName },
      );
      expect(writeWithEarlierToken.status).toBe(403);
      const refreshedEarlier = await refreshTokens(
        context,
        readWrite.client_id,
        readWrite.refresh_token,
      );
      expect(refreshedEarlier.status).toBe(200);
      expect(refreshedEarlier.body.scope).toBe("autodroid:read");
    });

    it("should still run a tool the read-only token covers", async context => {
      const { access_token } = await completeAuthorization(
        context,
        context.userAuthorized,
        "autodroid:read",
      );

      const result = await callTool(context, access_token, "autodroid_whoami");

      expect(result.isError).toBeUndefined();
    });

    it("should list the admin tools to an administrator whose token lacks the admin scope, and ask for it, keeping the scopes held, on a call", async context => {
      const { access_token } = await completeAuthorization(
        context,
        context.adminAuthorized,
        "autodroid:read autodroid:write",
      );

      expect(await listedToolNames(context, access_token)).toEqual([
        ...mcpToolNamesOf("user"),
        ...mcpToolNamesOf("admin"),
      ]);
      const response = await callToolRaw(
        context,
        access_token,
        "autodroid_admin_list_workers",
      );
      expect(response.status).toBe(403);
      expect(response.headers["www-authenticate"]).toContain(
        'scope="autodroid:read autodroid:write autodroid:admin"',
      );
    });

    it("should run an admin tool for an administrator whose token holds the scopes it needs", async context => {
      const { access_token } = await completeAuthorization(
        context,
        context.adminAuthorized,
        "autodroid:read autodroid:admin",
      );

      const result = await callTool(
        context,
        access_token,
        "autodroid_admin_list_workers",
      );

      expect(result.isError).toBeUndefined();
    });

    it("should refuse an authorization that asks for a scope the server does not know", async context => {
      const { client_id } = (await registerClient(context)).body;

      const response = await startAuthorization(
        context,
        client_id,
        makePkcePair().challenge,
        "autodroid:read openid",
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("invalid_scope");
    });

    it("should keep the granted scopes on refresh, and allow narrowing them without ever losing the grant", async context => {
      const { client_id, refresh_token } = await completeAuthorization(
        context,
        context.userAuthorized,
        "autodroid:read autodroid:write",
      );

      const kept = await refreshTokens(context, client_id, refresh_token);
      expect(kept.status).toBe(200);
      expect(kept.body.scope).toBe("autodroid:read autodroid:write");

      const narrowed = await refreshTokens(
        context,
        client_id,
        kept.body.refresh_token,
        "autodroid:read",
      );
      expect(narrowed.status).toBe(200);
      expect(narrowed.body.scope).toBe("autodroid:read");
      expect(
        (
          await callToolRaw(
            context,
            narrowed.body.access_token,
            "autodroid_update_profile",
            { name: probeName },
          )
        ).status,
      ).toBe(403);

      const broadenedAgain = await refreshTokens(
        context,
        client_id,
        narrowed.body.refresh_token,
        "autodroid:read autodroid:write",
      );
      expect(broadenedAgain.status).toBe(200);
      expect(broadenedAgain.body.scope).toBe("autodroid:read autodroid:write");
    });

    it("should refuse a refresh that asks for a scope the grant never held", async context => {
      const { client_id, refresh_token } = await completeAuthorization(
        context,
        context.userAuthorized,
        "autodroid:read",
      );

      const widened = await refreshTokens(
        context,
        client_id,
        refresh_token,
        "autodroid:read autodroid:write",
      );

      expect(widened.status).toBe(400);
      expect(widened.body.error).toBe("invalid_scope");
    });

    it("should not show a request that asked only for a scope the person may not hold, and so let none be approved", async context => {
      const { client_id } = (await registerClient(context)).body;
      const authorizeResponse = await startAuthorization(
        context,
        client_id,
        makePkcePair().challenge,
        "autodroid:admin",
      );
      const request_id = extractRequestId(authorizeResponse.headers.location);

      const shown = await context.userAuthorized(
        context.request.get(`/mcp-auth/${request_id}`),
      );
      const decision = await context
        .userAuthorized(
          context.request.post(`/mcp-auth/${request_id}/decision`),
        )
        .send({ approve: true });

      expect(shown.status).toBe(400);
      expect(JSON.stringify(shown.body)).toContain(
        "Nothing this request asks for may be granted to your account.",
      );
      expect(decision.status).toBe(409);
    });
  });

  it("should not let a non-admin session call an admin tool by name", async context => {
    const { access_token } = await completeAuthorization(context);

    const result = await callTool(
      context,
      access_token,
      "autodroid_admin_create_worker_registration_token",
      { data: { is_unlimited_usage: true } },
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      "Tool autodroid_admin_create_worker_registration_token not found",
    );
    const tokensResponse = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: `query { adminWorkerRegistrationTokens { totalCount } }`,
      });
    expect(
      tokensResponse.body.data.adminWorkerRegistrationTokens.totalCount,
    ).toBe(0);
  });

  it("should create, read, update and delete a processor through the admin tools", async context => {
    const { access_token } = await completeAuthorization(
      context,
      context.adminAuthorized,
    );
    const imageTag = `registry.example.test/processor:${randomBytes(6).toString("hex")}`;

    const createResult = await callTool(
      context,
      access_token,
      "autodroid_admin_create_processor",
      { data: makeProcessorDefinition(imageTag) },
    );
    expect(createResult.isError).not.toBe(true);
    const createdProcessor = parseToolResult(createResult);
    expect(createdProcessor).toEqual({
      id: expect.any(String),
      name: "Example Processor",
      version: "1.0.0",
      image_tag: imageTag,
      description: null,
      tags: null,
      allowed_mime_types: "text/csv",
      visibility: "HIDDEN",
      configuration: {
        command: "run",
        dataset_input_argument: "-i",
        dataset_input_value: "input",
        dataset_output_argument: "-o",
        dataset_output_value: "output",
        output_metrics_file_glob_patterns: ["*"],
        output_result_file_glob_patterns: ["*"],
        parameters: [
          {
            sequence: 1,
            name: "threshold",
            description: "Detection threshold",
            type: "STRING",
            is_required: false,
            default_value: null,
          },
        ],
      },
    });

    const updateResult = await callTool(
      context,
      access_token,
      "autodroid_admin_update_processor",
      {
        processor_id: createdProcessor.id,
        data: { ...makeProcessorDefinition(imageTag), version: "1.1.0" },
      },
    );
    expect(updateResult.isError).not.toBe(true);

    const showResult = await callTool(
      context,
      access_token,
      "autodroid_admin_show_processor",
      { processor_id: createdProcessor.id },
    );
    expect(parseToolResult(showResult)).toEqual({
      ...createdProcessor,
      version: "1.1.0",
    });

    const deleteResult = await callTool(
      context,
      access_token,
      "autodroid_admin_delete_processor",
      { processor_id: createdProcessor.id },
    );
    expect(deleteResult.isError).not.toBe(true);
    const showDeletedResult = await callTool(
      context,
      access_token,
      "autodroid_admin_show_processor",
      { processor_id: createdProcessor.id },
    );
    expect(showDeletedResult.isError).toBe(true);
  });

  it("should reveal a worker registration token's value only to its creation and an admin's explicit fetch, never to a list or a delete", async context => {
    const { access_token } = await completeAuthorization(
      context,
      context.adminAuthorized,
    );

    const createResult = await callTool(
      context,
      access_token,
      "autodroid_admin_create_worker_registration_token",
      { data: { is_unlimited_usage: true } },
    );
    expect(createResult.isError).not.toBe(true);
    const createdToken = parseToolResult(createResult);
    expect(createdToken).toMatchObject({
      id: expect.any(String),
      is_unlimited_usage: true,
      token: expect.any(String),
    });

    const showResult = await callTool(
      context,
      access_token,
      "autodroid_admin_show_worker_registration_token",
      { worker_registration_token_id: createdToken.id },
    );
    expect(parseToolResult(showResult)).toMatchObject({
      id: createdToken.id,
      is_unlimited_usage: true,
      token: createdToken.token,
    });

    const listResult = await callTool(
      context,
      access_token,
      "autodroid_admin_list_worker_registration_tokens",
      { take: 100 },
    );
    expect(listResult.isError).not.toBe(true);
    expect(parseToolResult(listResult)).toEqual({
      items: [expect.objectContaining({ id: createdToken.id })],
      total_count: 1,
      has_next_page: false,
    });
    expect(listResult.content[0].text).not.toContain(createdToken.token);

    const deleteResult = await callTool(
      context,
      access_token,
      "autodroid_admin_delete_worker_registration_token",
      { worker_registration_token_id: createdToken.id },
    );
    expect(deleteResult.isError).not.toBe(true);
    expect(deleteResult.content[0].text).not.toContain(createdToken.token);
  });

  it("should update and read back the user's own dataset, and refuse to change another user's private dataset", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const ownFile = await fileFactory.create({
      mime_type: MIME_TYPE.CSV,
      allow_public_access: true,
      upload_url: null,
      upload_url_expires_at: null,
      public_url: "https://storage.example.test/download/own-dataset",
      public_url_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const [ownDataset, otherUsersDataset] = await Promise.all([
      datasetFactory.create(
        { user_id: user.id, visibility: DATASET_VISIBILITY.PRIVATE },
        { associations: { file: ownFile } },
      ),
      datasetFactory.create({ visibility: DATASET_VISIBILITY.PRIVATE }),
    ]);
    const { access_token } = await completeAuthorization(context);

    const updateResult = await callTool(
      context,
      access_token,
      "autodroid_update_dataset",
      {
        dataset_id: ownDataset.id,
        data: { description: "Updated through MCP", tags: "mcp,e2e" },
      },
    );
    const showResult = await callTool(
      context,
      access_token,
      "autodroid_show_dataset",
      { dataset_id: ownDataset.id },
    );
    const otherUsersResult = await callTool(
      context,
      access_token,
      "autodroid_update_dataset",
      { dataset_id: otherUsersDataset.id, data: { description: "Not mine" } },
    );

    const expectedDataset = {
      id: ownDataset.id,
      description: "Updated through MCP",
      tags: "mcp,e2e",
      visibility: DATASET_VISIBILITY.PRIVATE,
      created_at: ownDataset.created_at.toISOString(),
      user_id: user.id,
    };
    expect(parseToolResult(updateResult)).toEqual(expectedDataset);
    expect(parseToolResult(showResult)).toEqual({
      ...expectedDataset,
      file: {
        id: ownFile.id,
        filename: ownFile.filename,
        mime_type: "CSV",
        size: ownFile.size,
        public_url: "https://storage.example.test/download/own-dataset",
        public_url_expires_at: ownFile.public_url_expires_at!.toISOString(),
      },
    });
    expect(otherUsersResult).toEqual({
      isError: true,
      content: [{ type: "text", text: "Dataset not public." }],
    });
  });

  it("should list only the user's runs matching a filter, honour skip on the last page, and refuse a malformed filter", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const [filteredDataset, otherDataset] = await Promise.all([
      datasetFactory.create({
        user_id: user.id,
        visibility: DATASET_VISIBILITY.PRIVATE,
      }),
      datasetFactory.create({
        user_id: user.id,
        visibility: DATASET_VISIBILITY.PRIVATE,
      }),
    ]);
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const createRun = (dataset: typeof filteredDataset) =>
      processingFactory.create(
        {
          status: PROCESSING_STATUS.PENDING,
          visibility: PROCESSING_VISIBILITY.PRIVATE,
        },
        { associations: { user, dataset, processor } },
      );
    const filteredRuns = await Promise.all([
      createRun(filteredDataset),
      createRun(filteredDataset),
      createRun(filteredDataset),
    ]);
    await createRun(otherDataset);
    const { access_token } = await completeAuthorization(context);

    const allResult = await callTool(
      context,
      access_token,
      "autodroid_list_processing",
      { dataset_id: filteredDataset.id },
    );
    const lastPageResult = await callTool(
      context,
      access_token,
      "autodroid_list_processing",
      { dataset_id: filteredDataset.id, take: 2, skip: 2 },
    );
    const malformedResult = await callTool(
      context,
      access_token,
      "autodroid_list_processing",
      { dataset_id: "not-a-uuid" },
    );

    const allPage = parseToolResult(allResult);
    const listedIds = allPage.items.map((run: { id: string }) => run.id);
    expect([...listedIds].sort()).toEqual(
      filteredRuns.map(run => run.id).sort(),
    );
    expect(allPage.total_count).toBe(3);
    expect(allPage.has_next_page).toBe(false);
    const lastPage = parseToolResult(lastPageResult);
    expect(lastPage.items).toHaveLength(1);
    expect(lastPage.total_count).toBe(3);
    expect(lastPage.has_next_page).toBe(false);
    const lastRun = filteredRuns.find(run => run.id === lastPage.items[0].id)!;
    expect(lastPage.items[0]).toEqual({
      id: lastRun.id,
      status: PROCESSING_STATUS.PENDING,
      visibility: PROCESSING_VISIBILITY.PRIVATE,
      keep_until: lastRun.keep_until?.toISOString() ?? null,
      created_at: lastRun.created_at.toISOString(),
      started_at: null,
      finished_at: null,
      user_id: user.id,
    });
    expect(malformedResult).toEqual({
      isError: true,
      content: [{ type: "text", text: "dataset_id must be a UUID" }],
    });
  });

  it("should refuse to revoke another user's connection as if it did not exist, and leave it working", async context => {
    const adminConnection = await completeAuthorization(
      context,
      context.adminAuthorized,
    );
    const adminConnectionsResponse = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({ query: `query { userMcpAuthorizationGrants { id client_id } }` });
    const adminGrant =
      adminConnectionsResponse.body.data.userMcpAuthorizationGrants.find(
        (grant: { client_id: string }) =>
          grant.client_id === adminConnection.client_id,
      );
    const { access_token } = await completeAuthorization(context);

    const revokeResult = await callTool(
      context,
      access_token,
      "autodroid_revoke_mcp_connection",
      { mcp_authorization_grant_id: adminGrant.id },
    );

    expect(revokeResult).toEqual({
      isError: true,
      content: [{ type: "text", text: "Connection not found." }],
    });
    expect((await callMcp(context, adminConnection.access_token)).status).toBe(
      200,
    );
  });

  it("should run the admin sweeps through the tools, removing a stale worker and reporting nothing to do for the rest", async context => {
    const staleWorker = await workerFactory.create({
      missing: false,
      last_seen_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });
    const { access_token } = await completeAuthorization(
      context,
      context.adminAuthorized,
    );

    const firstCleanResult = await callTool(
      context,
      access_token,
      "autodroid_admin_clean_missing_workers",
    );
    const secondCleanResult = await callTool(
      context,
      access_token,
      "autodroid_admin_clean_missing_workers",
    );
    const danglingFilesResult = await callTool(
      context,
      access_token,
      "autodroid_admin_remove_dangling_files",
    );
    const expiredProcessingResult = await callTool(
      context,
      access_token,
      "autodroid_admin_clean_expired_processing",
    );
    const failDanglingResult = await callTool(
      context,
      access_token,
      "autodroid_admin_fail_dangling_processing",
      { created_at_end_date: "2020-01-01T00:00:00Z", status: "RUNNING" },
    );

    expect(parseToolResult(firstCleanResult)).toEqual({ removed: 1 });
    expect(parseToolResult(secondCleanResult)).toEqual({ removed: 0 });
    expect(parseToolResult(danglingFilesResult)).toEqual({ removed: 0 });
    expect(parseToolResult(expiredProcessingResult)).toEqual({ removed: 0 });
    expect(parseToolResult(failDanglingResult)).toEqual({ failed: 0 });
    const workerResult = await callTool(
      context,
      access_token,
      "autodroid_admin_show_worker",
      { worker_id: staleWorker.id },
    );
    expect(parseToolResult(workerResult)).toEqual({
      id: staleWorker.id,
      name: staleWorker.name,
      version: staleWorker.version,
      description: staleWorker.description,
      tags: staleWorker.tags,
      last_seen_at: staleWorker.last_seen_at!.toISOString(),
      archived_at: null,
      created_at: staleWorker.created_at.toISOString(),
      user_id: staleWorker.user_id,
    });
  });
});

import { createHash, randomBytes } from "node:crypto";
import { expect } from "vitest";

// Constant import
import { MCP_SUPPORTED_SCOPES } from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";

// Type import
import type { TestContext } from "@/test/types/testContext.type";

export const REDIRECT_URI = "https://client.example.com/callback";

export const makePkcePair = () => {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
};

export const registerClient = async (
  context: TestContext,
  overrides: Record<string, unknown> = {},
) => {
  const response = await context.request.post("/oauth/register").send({
    redirect_uris: [REDIRECT_URI],
    client_name: "Test MCP Client",
    token_endpoint_auth_method: "none",
    ...overrides,
  });
  return response;
};

export const startAuthorization = async (
  context: TestContext,
  client_id: string,
  challenge: string,
  scope?: string,
) =>
  context.request.get("/oauth/authorize").query({
    response_type: "code",
    client_id,
    code_challenge: challenge,
    code_challenge_method: "S256",
    redirect_uri: REDIRECT_URI,
    ...(scope && { scope }),
  });

export const extractRequestId = (locationHeader: string): string =>
  new URL(locationHeader).searchParams.get("request_id")!;

export const exchangeCodeForTokens = async (
  context: TestContext,
  {
    code,
    client_id,
    verifier,
  }: { code: string; client_id: string; verifier: string },
) =>
  context.request.post("/oauth/token").type("form").send({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    client_id,
    redirect_uri: REDIRECT_URI,
  });

export const ALL_SCOPES = MCP_SUPPORTED_SCOPES.join(" ");

export const authorizeClient = async (
  context: TestContext,
  client_id: string,
  authorize: TestContext["userAuthorized"] = context.userAuthorized,
  scope: string = ALL_SCOPES,
) => {
  const { verifier, challenge } = makePkcePair();
  const authorizeResponse = await startAuthorization(
    context,
    client_id,
    challenge,
    scope,
  );
  const request_id = extractRequestId(authorizeResponse.headers.location);
  await authorize(context.request.get(`/mcp-auth/${request_id}`));
  const decisionResponse = await authorize(
    context.request.post(`/mcp-auth/${request_id}/decision`),
  ).send({ approve: true });
  const code = new URL(decisionResponse.body.redirect_to).searchParams.get(
    "code",
  )!;
  const { body } = await exchangeCodeForTokens(context, {
    code,
    client_id,
    verifier,
  });

  return {
    client_id,
    access_token: body.access_token as string,
    refresh_token: body.refresh_token as string,
    scope: body.scope as string,
  };
};

export const completeAuthorization = async (
  context: TestContext,
  authorize: TestContext["userAuthorized"] = context.userAuthorized,
  scope: string = ALL_SCOPES,
) => {
  const { client_id } = (await registerClient(context)).body;

  return authorizeClient(context, client_id, authorize, scope);
};

export const callTool = async (
  context: TestContext,
  access_token: string,
  name: string,
  toolArguments: Record<string, unknown> = {},
) => {
  const response = await context.request
    .post("/mcp")
    .set("Authorization", `Bearer ${access_token}`)
    .set("Accept", "application/json, text/event-stream")
    .send({
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: { name, arguments: toolArguments },
    });
  expect(response.status).toBe(200);
  return response.body.result as {
    isError?: boolean;
    content: { type: string; text: string }[];
  };
};

export const parseToolResult = (result: { content: { text: string }[] }) =>
  JSON.parse(result.content[0].text);

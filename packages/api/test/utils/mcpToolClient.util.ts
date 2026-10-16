import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { TestContext } from "vitest";

// Util import
import { createMcpGraphQLExecutor } from "@modules/mcp/utils/createMcpGraphQLExecutor.util";
import { createMcpServer } from "@modules/mcp/utils/createMcpServer.util";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";

const connectMcpToolClient = async (
  context: TestContext,
  session: Session,
): Promise<Client> => {
  const execute = createMcpGraphQLExecutor(context.app.graphqlServer);
  const server = createMcpServer({
    session,
    executeOperation: operation =>
      execute({
        ...operation,
        session,
        req: { language: "en" },
        res: {},
      }),
  });

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-host", version: "1.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return client;
};

const callMcpTool = async (
  client: Client,
  name: string,
  input: Record<string, unknown> = {},
) => {
  const result = (await client.callTool({ name, arguments: input })) as {
    isError?: boolean;
    content: { type: "text"; text: string }[];
    structuredContent?: Record<string, any>;
  };
  const [{ text }] = result.content;

  return {
    isError: !!result.isError,
    text,
    body: result.isError ? undefined : JSON.parse(text),
    structuredContent: result.structuredContent,
  };
};

export { callMcpTool, connectMcpToolClient };

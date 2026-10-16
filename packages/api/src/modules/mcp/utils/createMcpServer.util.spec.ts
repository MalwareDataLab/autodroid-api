import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// Configuration import
import { getEnvConfig } from "@config/env";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";
import { logger } from "@shared/utils/logger";

// Target import
import {
  createMcpServer,
  deriveEveryMcpToolInput,
} from "./createMcpServer.util";

const mocks = vi.hoisted(() => ({
  registerTool: vi.fn(),
  McpServer: vi.fn(),
  captureException: vi.fn(),
  listMcpToolsFor: vi.fn(),
  buildMcpToolInputShape: vi.fn(),
}));

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

vi.mock("@sentry/node", () => ({ captureException: mocks.captureException }));

vi.mock("@shared/utils/logger", () => ({ logger: { error: vi.fn() } }));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: mocks.McpServer.mockImplementation(() => ({
    registerTool: mocks.registerTool,
  })),
}));

vi.mock("@modules/mcp/utils/mcpToolInputShape.util", () => ({
  buildMcpToolInputShape: mocks.buildMcpToolInputShape,
}));

vi.mock("@modules/mcp/utils/mcpToolScopes.util", () => ({
  listMcpToolsFor: mocks.listMcpToolsFor,
}));

const getEnvConfigMock = vi.mocked(getEnvConfig);

const SESSION = { user: { id: "user-1" }, is_admin: false } as any;
const ADMIN_SESSION = { user: { id: "admin-1" }, is_admin: true } as any;

const WHOAMI = {
  name: "autodroid_whoami",
  description: "Return the AutoDroid user.",
  annotations: { readOnlyHint: true },
  document: "query { user { id } }",
};
const ADMIN_LIST = {
  name: "autodroid_admin_list_datasets",
  description: "List every dataset.",
  annotations: { readOnlyHint: true },
  document: "query { adminDatasets { totalCount } }",
};

describe("Util: createMcpServer", () => {
  const executeOperation = vi.fn();

  const create = (session = SESSION) =>
    createMcpServer({ session, executeOperation });

  const toolHandler = (index = 0) => mocks.registerTool.mock.calls[index][2];

  beforeEach(() => {
    mocks.McpServer.mockImplementation(() => ({
      registerTool: mocks.registerTool,
    }));
    mocks.listMcpToolsFor.mockReturnValue([WHOAMI]);
    mocks.buildMcpToolInputShape.mockImplementation(({ document }) => ({
      derivedFrom: z.literal(document),
    }));
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({ APP_INFO: { version: "1.2.3" } as any }),
    );
  });

  it("should identify itself to the client with the app's own version", () => {
    create();

    expect(mocks.McpServer).toHaveBeenCalledWith({
      name: "autodroid",
      version: "1.2.3",
    });
  });

  it("should register only the tools the person may use, with a title, description, input and annotations", () => {
    create();

    expect(mocks.listMcpToolsFor).toHaveBeenCalledExactlyOnceWith({
      isAdmin: false,
    });
    expect(mocks.registerTool.mock.calls).toEqual([
      [
        "autodroid_whoami",
        {
          title: "Whoami",
          description: "Return the AutoDroid user.",
          inputSchema: expect.any(z.ZodObject),
          annotations: { readOnlyHint: true },
        },
        expect.any(Function),
      ],
    ]);
    expect(
      z.toJSONSchema(mocks.registerTool.mock.calls[0][1].inputSchema),
    ).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        derivedFrom: { type: "string", const: "query { user { id } }" },
      },
      required: ["derivedFrom"],
      additionalProperties: false,
    });
  });

  it("should refuse an input key the tool does not declare, naming it", () => {
    create();
    const { inputSchema } = mocks.registerTool.mock.calls[0][1];

    expect(
      inputSchema.safeParse({
        derivedFrom: "query { user { id } }",
        unexpected_key: 1,
      }).error.issues,
    ).toEqual([
      {
        code: "unrecognized_keys",
        keys: ["unexpected_key"],
        path: [],
        message: 'Unrecognized key: "unexpected_key"',
      },
    ]);
    expect(inputSchema.parse({ derivedFrom: "query { user { id } }" })).toEqual(
      { derivedFrom: "query { user { id } }" },
    );
  });

  it("should register the admin tools the list gives for an admin session", () => {
    mocks.listMcpToolsFor.mockReturnValue([WHOAMI, ADMIN_LIST]);
    create(ADMIN_SESSION);

    expect(mocks.listMcpToolsFor).toHaveBeenCalledExactlyOnceWith({
      isAdmin: true,
    });
    expect(mocks.registerTool.mock.calls.map(([name]) => name)).toEqual([
      "autodroid_whoami",
      "autodroid_admin_list_datasets",
    ]);
    expect(mocks.registerTool.mock.calls[1][1].title).toBe(
      "Admin list datasets",
    );
  });

  it("should run the tool's operation with the input as its variables and answer with the operation's field", async () => {
    executeOperation.mockResolvedValue({ user: { id: "user-1" } });
    create();

    await expect(toolHandler()({ take: 5 })).resolves.toEqual({
      content: [
        { type: "text", text: JSON.stringify({ id: "user-1" }, null, 2) },
      ],
      structuredContent: { id: "user-1" },
    });
    expect(executeOperation).toHaveBeenCalledExactlyOnceWith({
      document: "query { user { id } }",
      variables: { take: 5 },
    });
  });

  it("should derive a tool's input from its declaration once, reusing it for every later server", () => {
    const tool = { ...WHOAMI, name: "autodroid_derived_once" };
    mocks.listMcpToolsFor.mockReturnValue([tool]);
    create();
    create();

    const [firstInput, secondInput] = mocks.registerTool.mock.calls.map(
      ([, { inputSchema }]) => inputSchema,
    );
    expect(mocks.buildMcpToolInputShape.mock.calls).toEqual([[tool]]);
    expect(secondInput).toBe(firstInput);
  });

  it("should derive every tool's input up front, admin tools included, so no later server derives it again", () => {
    const tools = [
      { ...WHOAMI, name: "autodroid_derived_up_front" },
      { ...ADMIN_LIST, name: "autodroid_admin_derived_up_front" },
    ];
    mocks.listMcpToolsFor.mockReturnValue(tools);

    deriveEveryMcpToolInput();
    create(ADMIN_SESSION);

    expect(mocks.listMcpToolsFor.mock.calls).toEqual([
      [{ isAdmin: true }],
      [{ isAdmin: true }],
    ]);
    expect(mocks.buildMcpToolInputShape.mock.calls).toEqual([
      [tools[0]],
      [tools[1]],
    ]);
  });

  it("should fail to derive every tool's input when one has no MCP input counterpart", () => {
    const failure = new Error(
      "The validation isEmail on UserSchema.email has no MCP input counterpart.",
    );
    mocks.listMcpToolsFor.mockReturnValue([
      { ...WHOAMI, name: "autodroid_underivable" },
    ]);
    mocks.buildMcpToolInputShape.mockImplementation(() => {
      throw failure;
    });

    expect(() => deriveEveryMcpToolInput()).toThrow(failure);
  });

  it("should answer with the tool's own result when it has one", async () => {
    executeOperation.mockResolvedValue({ user: { id: "user-1" } });
    mocks.listMcpToolsFor.mockReturnValue([
      { ...WHOAMI, result: () => ({ closed: true }) },
    ]);
    create();

    await expect(toolHandler()({})).resolves.toEqual({
      content: [
        { type: "text", text: JSON.stringify({ closed: true }, null, 2) },
      ],
      structuredContent: { closed: true },
    });
  });

  it("should report an application error to the host with its own message", async () => {
    executeOperation.mockRejectedValue(
      new AppError({
        key: "@test/NOT_ALLOWED",
        message: "You are not allowed to do that.",
        statusCode: 403,
      }),
    );
    create();

    await expect(toolHandler()({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: "You are not allowed to do that." }],
    });
    expect(mocks.captureException).not.toHaveBeenCalled();
  });

  it("should hide an unexpected failure from the host behind a generic message, while logging it and reporting it to Sentry", async () => {
    const failure = new Error(
      'Invalid `prisma.user.findMany()` invocation: password for "app" failed',
    );
    executeOperation.mockRejectedValue(failure);
    create();

    await expect(toolHandler()({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: "Internal server error." }],
    });
    expect(logger.error).toHaveBeenCalledOnce();
    expect(mocks.captureException).toHaveBeenCalledWith(failure);
  });
});

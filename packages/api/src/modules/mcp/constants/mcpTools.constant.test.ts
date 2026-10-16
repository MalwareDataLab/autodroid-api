import { describe, expect, it } from "vitest";

// Util import
import {
  callMcpTool,
  connectMcpToolClient,
} from "@/test/utils/mcpToolClient.util";
import {
  MCP_TOOL_CONTRACT,
  MCP_TOOL_NAME_PREFIX,
  mcpToolNamesOf,
} from "@/test/utils/mcpToolContract.util";
import {
  MCP_TOOL_REFUSALS,
  MCP_TOOL_SCENARIOS,
} from "@/test/utils/mcpToolScenarios.util";
import { seedMcpToolWorld } from "@/test/utils/mcpToolWorld.util";
import { useIntegrationServer } from "@/test/utils/useIntegrationServer.util";

// Target import
import { MCP_ADMIN_TOOLS, MCP_USER_TOOLS } from "./mcpTools.constant";

const contractOf = (toolName: string) =>
  MCP_TOOL_CONTRACT.find(
    tool => `${MCP_TOOL_NAME_PREFIX}${tool.name}` === toolName,
  )!;

const EXTRA_OUTPUT: Record<string, string[]> = {
  autodroid_create_dataset: ["file"],
};

const TOKEN_VALUE_TOOLS = [
  "autodroid_admin_show_worker_registration_token",
  "autodroid_admin_create_worker_registration_token",
];

const labelOf = (index: number, tool: string) => `${index} ${tool}`;

const maskRunSpecificValues = (
  body: unknown,
  replacements: Map<string, string>,
  volatile: string[] = [],
) =>
  JSON.parse(
    [...replacements].reduce(
      (text, [id, label]) => text.split(id).join(`<${label}>`),
      JSON.stringify(body, (key, value) =>
        volatile.includes(key) ? "<volatile>" : value,
      ),
    ),
  );

describe("MCP tools: run through the GraphQL API", () => {
  useIntegrationServer();

  it("should have a scenario for every tool", () => {
    expect(
      [...new Set(MCP_TOOL_SCENARIOS.map(({ tool }) => tool))].sort(),
    ).toEqual(
      [...MCP_USER_TOOLS, ...MCP_ADMIN_TOOLS].map(({ name }) => name).sort(),
    );
  });

  it.for(
    MCP_TOOL_SCENARIOS.map(
      (scenario, index) => [labelOf(index, scenario.tool), scenario] as const,
    ),
  )(
    "%s should answer with exactly the contract's fields and none of the world's secrets",
    async ([, scenario], context) => {
      const world = await seedMcpToolWorld(context);
      const session =
        scenario.caller === "owner" ? world.ownerSession : world.adminSession;
      const client = await connectMcpToolClient(context, session);
      const contractTool = contractOf(scenario.tool);

      const { isError, text, body, structuredContent } = await callMcpTool(
        client,
        scenario.tool,
        scenario.input(world),
      );

      expect(isError ? text : undefined).toBeUndefined();
      expect(structuredContent).toEqual(body);
      expect(
        maskRunSpecificValues(
          body,
          new Map([
            ...world.idLabels,
            [world.ownerUser.email, "ownerUser.email"],
            [world.adminUser.email, "adminUser.email"],
          ]),
          scenario.volatile,
        ),
      ).toMatchSnapshot();
      expect(Object.keys(body).sort()).toEqual(
        [...contractTool.output, ...(EXTRA_OUTPUT[scenario.tool] ?? [])].sort(),
      );
      if (contractTool.itemOutput) {
        expect(body.items.length).toBeGreaterThan(0);
        body.items.forEach((item: object) =>
          expect(Object.keys(item).sort()).toEqual(
            [...contractTool.itemOutput!].sort(),
          ),
        );
      }

      const secrets = [
        world.ownerSession.user_session.access_token,
        world.worker.refresh_token,
        world.resultFile.provider_path,
        world.ownDatasetFile.provider_path,
        ...(TOKEN_VALUE_TOOLS.includes(scenario.tool)
          ? []
          : [
              world.usedRegistrationToken.token,
              world.freeRegistrationToken.token,
            ]),
      ];
      secrets.forEach(secret => expect(text).not.toContain(secret as string));
    },
  );

  it.for(
    MCP_TOOL_REFUSALS.map(
      (scenario, index) => [labelOf(index, scenario.tool), scenario] as const,
    ),
  )(
    "%s should refuse in words the person can act on",
    async ([, scenario], context) => {
      const world = await seedMcpToolWorld(context);
      const session =
        scenario.caller === "owner" ? world.ownerSession : world.adminSession;
      const client = await connectMcpToolClient(context, session);

      const { isError, text } = await callMcpTool(
        client,
        scenario.tool,
        scenario.input(world),
      );

      expect(isError).toBe(true);
      expect(text).toBe(scenario.refusal);
    },
  );

  it("should offer a non-admin host exactly the contract's user tools, each with a title and its annotations", async context => {
    const world = await seedMcpToolWorld(context);
    const client = await connectMcpToolClient(context, world.ownerSession);

    const { tools } = await client.listTools();

    expect(tools.map(tool => tool.name)).toEqual(mcpToolNamesOf("user"));
    tools.forEach(tool => {
      expect(tool.title).toEqual(expect.any(String));
      expect(tool.annotations).toMatchObject({ openWorldHint: false });
    });
  });

  it("should offer an admin host the admin tools after the user tools", async context => {
    const world = await seedMcpToolWorld(context);
    const client = await connectMcpToolClient(context, world.adminSession);

    const { tools } = await client.listTools();

    expect(tools.map(tool => tool.name)).toEqual([
      ...mcpToolNamesOf("user"),
      ...mcpToolNamesOf("admin"),
    ]);
  });

  it("should not run an admin tool for a non-admin host", async context => {
    const world = await seedMcpToolWorld(context);
    const client = await connectMcpToolClient(context, world.ownerSession);

    await expect(
      callMcpTool(client, "autodroid_admin_remove_dangling_files"),
    ).resolves.toMatchObject({
      isError: true,
      text: expect.stringContaining("not found"),
    });
    await expect(
      context.repositories.FileRepository.findOne({
        id: world.danglingFile.id,
      }),
    ).resolves.toBeTruthy();
  });
});

import { describe, expect, it } from "vitest";

// Util import
import {
  LIVE_HOST_TIMEOUT_MS,
  hostAnswerOf,
  hostToolName,
  runLiveHost,
  startLiveServer,
  toolCallsOf,
} from "./mcpLiveHost.util";
import { ALL_SCOPES } from "./mcpOAuthFlow.util";
import { MCP_TOOL_SCENARIOS } from "./mcpToolScenarios.util";
import { seedMcpToolWorld } from "./mcpToolWorld.util";

// Constant import
import {
  MCP_SCOPE_READ,
  MCP_SCOPE_WRITE,
} from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";

const SESSIONS_CLOSING_TOOL = "autodroid_close_sessions";

const describeLiveHostScenarios = (
  title: string,
  scenarios: typeof MCP_TOOL_SCENARIOS,
) => {
  describe(title, () => {
    it.for(scenarios.map(scenario => [scenario.tool, scenario] as const))(
      "should let a real host call %s and get an answer",
      { timeout: LIVE_HOST_TIMEOUT_MS },
      async ([tool, scenario], context) => {
        const world = await seedMcpToolWorld(context);
        const isOwner = scenario.caller === "owner";
        const { url, access_token } = await startLiveServer(
          context,
          isOwner ? context.userAuthorized : context.adminAuthorized,
          isOwner ? `${MCP_SCOPE_READ} ${MCP_SCOPE_WRITE}` : ALL_SCOPES,
        );
        const input = scenario.input(world);
        const argumentsClause = Object.keys(input).length
          ? `exactly this JSON as its arguments, unchanged: ${JSON.stringify(input)}`
          : "no arguments";

        const events = await runLiveHost(
          url,
          access_token,
          `This is an automated test against disposable data, and you have my explicit approval for this call: do not ask for confirmation and do not look anything up first. Call the ${tool} tool exactly once with ${argumentsClause}. Then reply with the single word DONE.`,
        );

        const call = toolCallsOf(events).find(
          candidate => candidate.name === hostToolName(tool),
        );
        expect(call, hostAnswerOf(events)).toBeDefined();
        expect(call?.input).toEqual(JSON.parse(JSON.stringify(input)));
        expect(call?.answered).toBe(true);
        expect(call?.isError, call?.text).toBe(false);
        expect(call?.text).not.toBe("");
      },
    );
  });
};

const MCP_LIVE_SHARD_COUNT = 6;

const describeMcpEveryToolOnLiveHost = (shardFilePath: string) => {
  const shardIndex =
    Number(/mcpEveryTool(\d+)\.live/.exec(shardFilePath)![1]) - 1;

  return describeLiveHostScenarios(
    `Live host: every MCP tool, part ${shardIndex + 1} of ${MCP_LIVE_SHARD_COUNT}`,
    MCP_TOOL_SCENARIOS.filter(
      ({ tool }) => tool !== SESSIONS_CLOSING_TOOL,
    ).filter((_, index) => index % MCP_LIVE_SHARD_COUNT === shardIndex),
  );
};

const describeMcpSessionsClosingToolOnLiveHost = () =>
  describeLiveHostScenarios(
    "Live host: the MCP tool that signs the account out everywhere",
    MCP_TOOL_SCENARIOS.filter(({ tool }) => tool === SESSIONS_CLOSING_TOOL),
  );

export {
  describeMcpEveryToolOnLiveHost,
  describeMcpSessionsClosingToolOnLiveHost,
};

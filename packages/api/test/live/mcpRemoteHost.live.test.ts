import { randomBytes } from "node:crypto";
import { TestContext, describe, expect, it } from "vitest";

// Util import
import {
  LIVE_HOST_TIMEOUT_MS,
  MCP_SERVER_LABEL,
  hostToolName,
  runLiveHost,
  startLiveServer,
  toolCallsOf,
} from "@/test/utils/mcpLiveHost.util";
import { mcpToolNamesOf } from "@/test/utils/mcpToolContract.util";

// Constant import
import {
  MCP_SCOPE_READ,
  MCP_SCOPE_WRITE,
} from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";

const probeName = `Probe ${[...randomBytes(8)]
  .map(byte => String.fromCharCode(97 + (byte % 26)))
  .join("")}`;

describe("Live host: a real MCP host against the remote MCP endpoint", () => {
  const startHost = async (context: TestContext, scope: string) => {
    const { url, access_token } = await startLiveServer(
      context,
      context.userAuthorized,
      scope,
    );
    const profile = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: "query { user { id name } }" });

    return {
      userId: profile.body.data.user.id as string,
      originalName: profile.body.data.user.name as string,
      url,
      access_token,
    };
  };

  const profileNameOf = async (context: TestContext, userId: string) =>
    (await context.repositories.UserRepository.findOne({ id: userId }))?.name;

  it(
    "should list the user tools to the host and answer a reading call with the person's own data",
    async context => {
      const { userId, url, access_token } = await startHost(
        context,
        MCP_SCOPE_READ,
      );

      const events = await runLiveHost(
        url,
        access_token,
        "Call the autodroid_whoami tool once, then reply with the single word DONE.",
      );

      const init = events.find(
        event => event.type === "system" && event.subtype === "init",
      )!;
      expect(init.mcp_servers).toContainEqual(
        expect.objectContaining({
          name: MCP_SERVER_LABEL,
          status: "connected",
        }),
      );
      expect(
        init
          .tools!.filter(name => name.startsWith(`mcp__${MCP_SERVER_LABEL}__`))
          .sort(),
      ).toEqual(mcpToolNamesOf("user").map(hostToolName).sort());

      const whoami = toolCallsOf(events).find(
        call => call.name === hostToolName("autodroid_whoami"),
      );
      expect(whoami?.answered).toBe(true);
      expect(whoami?.isError).toBe(false);
      expect(whoami?.text).toContain(userId);
    },
    LIVE_HOST_TIMEOUT_MS,
  );

  it(
    "should refuse a write call through a read-only token and change nothing",
    async context => {
      const { userId, originalName, url, access_token } = await startHost(
        context,
        MCP_SCOPE_READ,
      );

      const events = await runLiveHost(
        url,
        access_token,
        `Call the autodroid_update_profile tool exactly once with exactly this JSON as its arguments, unchanged: ${JSON.stringify({ data: { name: probeName } })}. Then reply with the single word DONE.`,
      );

      const update = toolCallsOf(events).find(
        call => call.name === hostToolName("autodroid_update_profile"),
      );
      expect(update?.input).toEqual({ data: { name: probeName } });
      expect(update?.answered).toBe(true);
      expect(update?.isError).toBe(true);
      expect(update?.text).toMatch(/scope/i);
      await expect(profileNameOf(context, userId)).resolves.toBe(originalName);
    },
    LIVE_HOST_TIMEOUT_MS,
  );

  it(
    "should let a token with the write scope change the person's profile through the host",
    async context => {
      const { userId, url, access_token } = await startHost(
        context,
        `${MCP_SCOPE_READ} ${MCP_SCOPE_WRITE}`,
      );

      const events = await runLiveHost(
        url,
        access_token,
        `Call the autodroid_update_profile tool exactly once with exactly this JSON as its arguments, unchanged: ${JSON.stringify({ data: { name: probeName } })}. Then reply with the single word DONE.`,
      );

      const update = toolCallsOf(events).find(
        call => call.name === hostToolName("autodroid_update_profile"),
      );
      expect(update?.answered).toBe(true);
      expect(update?.isError, update?.text).toBe(false);
      await expect(profileNameOf(context, userId)).resolves.toBe(probeName);
    },
    LIVE_HOST_TIMEOUT_MS,
  );
});

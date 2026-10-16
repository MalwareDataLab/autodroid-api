import { describe, expect, it } from "vitest";

// Util import
import {
  callTool,
  completeAuthorization,
  parseToolResult,
} from "@/test/utils/mcpOAuthFlow.util";

// Constant import
import { MCP_TAKE_LIMIT } from "@modules/mcp/constants/mcp.constant";

// Factory import
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

describe("E2E: remote MCP list tool paging", () => {
  it.for([
    ["the whole list on one capped page", { take: 100 }, [0, 11], false],
    ["a middle page", { take: 4, skip: 4 }, [4, 8], true],
    ["a short last page", { take: 4, skip: 8 }, [8, 11], false],
    ["an exactly full last page", { take: 3, skip: 8 }, [8, 11], false],
    ["an empty page past the end", { skip: 11 }, [11, 11], false],
  ] as const)(
    "should page an admin list tool to %s, newest first with ties by id descending",
    async ([, page, [start, end], hasNextPage], context) => {
      const tokens = await Promise.all(
        Array.from({ length: 11 }, (_, index) =>
          workerRegistrationTokenFactory.create({
            id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
            created_at: new Date(Date.UTC(2026, 0, 1 + Math.floor(index / 2))),
          }),
        ),
      );
      const { access_token } = await completeAuthorization(
        context,
        context.adminAuthorized,
      );

      const result = parseToolResult(
        await callTool(
          context,
          access_token,
          "autodroid_admin_list_worker_registration_tokens",
          page,
        ),
      );

      expect({
        ids: result.items.map((token: { id: string }) => token.id),
        total_count: result.total_count,
        has_next_page: result.has_next_page,
      }).toEqual({
        ids: [...tokens]
          .reverse()
          .slice(start, end)
          .map(token => token.id),
        total_count: 11,
        has_next_page: hasNextPage,
      });
    },
  );

  it("should refuse a list tool page above the cap before asking the API", async context => {
    const { access_token } = await completeAuthorization(
      context,
      context.adminAuthorized,
    );

    const result = await callTool(
      context,
      access_token,
      "autodroid_admin_list_worker_registration_tokens",
      { take: MCP_TAKE_LIMIT + 1 },
    );

    expect(result).toMatchObject({ isError: true });
    expect(result.content[0].text).toContain(String(MCP_TAKE_LIMIT));
  });
});

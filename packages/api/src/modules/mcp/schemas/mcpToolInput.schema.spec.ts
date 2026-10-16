import { describe, expect, it } from "vitest";
import { z } from "zod";

// Constant import
import {
  MCP_TAKE_DEFAULT,
  MCP_TAKE_LIMIT,
} from "@modules/mcp/constants/mcp.constant";
import { TAKE_LIMIT } from "@modules/pagination/constants/paginationLimit.constant";

// Target import
import { pageInputPolicy } from "./mcpToolInput.schema";

describe("MCP: page input policy", () => {
  const input = z.object(pageInputPolicy);

  it("should keep the tool page sizes inside what the API accepts", () => {
    expect(MCP_TAKE_DEFAULT).toBeGreaterThan(0);
    expect(MCP_TAKE_DEFAULT).toBeLessThanOrEqual(MCP_TAKE_LIMIT);
    expect(MCP_TAKE_LIMIT).toBeLessThanOrEqual(TAKE_LIMIT);
  });

  it("should accept no take, one item and the tools' page-size cap", () => {
    expect(
      [{}, { take: 1 }, { take: MCP_TAKE_LIMIT }].map(page =>
        input.parse(page),
      ),
    ).toEqual([{}, { take: 1 }, { take: MCP_TAKE_LIMIT }]);
  });

  it.each([
    ["no item", 0],
    ["one item above the cap", MCP_TAKE_LIMIT + 1],
    ["a fraction", 1.5],
  ])("should reject a take of %s", (_case, take) => {
    expect(input.safeParse({ take }).success).toBe(false);
  });

  it("should tell the host the default and the cap", () => {
    expect(z.toJSONSchema(input).properties!.take).toMatchObject({
      description: `How many items to return (default ${MCP_TAKE_DEFAULT}, at most ${MCP_TAKE_LIMIT}).`,
    });
  });
});

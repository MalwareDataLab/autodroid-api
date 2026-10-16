import { describe, expect, it } from "vitest";

// Constant import
import {
  MCP_ADMIN_TOOLS,
  MCP_USER_TOOLS,
} from "@modules/mcp/constants/mcpTools.constant";
import {
  MCP_SCOPE_ADMIN,
  MCP_SCOPE_READ,
  MCP_SCOPE_WRITE,
} from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";

// Target import
import { findScopesToRequest, listMcpToolsFor } from "./mcpToolScopes.util";

const READ_TOOL = MCP_USER_TOOLS.find(
  ({ annotations }) => annotations.readOnlyHint,
)!;
const WRITE_TOOL = MCP_USER_TOOLS.find(
  ({ annotations }) => !annotations.readOnlyHint,
)!;
const ADMIN_READ_TOOL = MCP_ADMIN_TOOLS.find(
  ({ annotations }) => annotations.readOnlyHint,
)!;
const ADMIN_WRITE_TOOL = MCP_ADMIN_TOOLS.find(
  ({ annotations }) => !annotations.readOnlyHint,
)!;

const names = (tools: { name: string }[]) => tools.map(({ name }) => name);

describe("Util: mcpToolScopes", () => {
  describe("listMcpToolsFor", () => {
    it("should list every user tool and no admin tool for a regular user", () => {
      expect(names(listMcpToolsFor({ isAdmin: false }))).toEqual(
        names(MCP_USER_TOOLS),
      );
    });

    it("should list the admin tools after the user tools for an administrator", () => {
      expect(names(listMcpToolsFor({ isAdmin: true }))).toEqual([
        ...names(MCP_USER_TOOLS),
        ...names(MCP_ADMIN_TOOLS),
      ]);
    });
  });

  describe("findScopesToRequest", () => {
    const readOnly = { isAdmin: false, scopes: [MCP_SCOPE_READ] };

    it("should add the scope a user tool needs to the scopes the token holds, so a client that asks for exactly these keeps what it had", () => {
      expect(findScopesToRequest(WRITE_TOOL.name, readOnly)).toEqual([
        MCP_SCOPE_READ,
        MCP_SCOPE_WRITE,
      ]);
    });

    it("should add every scope an admin tool needs, in a fixed order", () => {
      expect(
        findScopesToRequest(ADMIN_WRITE_TOOL.name, {
          isAdmin: true,
          scopes: [MCP_SCOPE_READ],
        }),
      ).toEqual([MCP_SCOPE_READ, MCP_SCOPE_WRITE, MCP_SCOPE_ADMIN]);
    });

    it("should keep the token's own scopes in the answer, whatever the tool", () => {
      expect(
        findScopesToRequest(ADMIN_WRITE_TOOL.name, {
          isAdmin: true,
          scopes: [MCP_SCOPE_ADMIN],
        }),
      ).toEqual([MCP_SCOPE_WRITE, MCP_SCOPE_ADMIN]);
    });

    it("should need the read scope as well as admin for an admin reading tool", () => {
      expect(
        findScopesToRequest(ADMIN_READ_TOOL.name, {
          isAdmin: true,
          scopes: [MCP_SCOPE_WRITE, MCP_SCOPE_ADMIN],
        }),
      ).toEqual([MCP_SCOPE_READ, MCP_SCOPE_WRITE, MCP_SCOPE_ADMIN]);
    });

    it("should answer nothing when the token holds what the tool needs", () => {
      expect(findScopesToRequest(READ_TOOL.name, readOnly)).toEqual([]);
      expect(
        findScopesToRequest(ADMIN_WRITE_TOOL.name, {
          isAdmin: true,
          scopes: [MCP_SCOPE_READ, MCP_SCOPE_WRITE, MCP_SCOPE_ADMIN],
        }),
      ).toEqual([]);
    });

    it("should answer nothing for a tool that does not exist", () => {
      expect(findScopesToRequest("autodroid_nothing", readOnly)).toEqual([]);
    });

    it("should answer nothing for an admin tool when the person is not an administrator, who has nothing to ask for", () => {
      expect(findScopesToRequest(ADMIN_WRITE_TOOL.name, readOnly)).toEqual([]);
    });
  });
});

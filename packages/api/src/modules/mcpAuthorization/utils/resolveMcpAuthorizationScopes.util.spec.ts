import { describe, expect, it } from "vitest";

// Constant import
import {
  MCP_SCOPE_ADMIN,
  MCP_SCOPE_READ,
  MCP_SCOPE_WRITE,
} from "../constants/mcpAuthorization.constant";

// Target import
import {
  grantableMcpAuthorizationScopes,
  resolveMcpAuthorizationScopes,
} from "./resolveMcpAuthorizationScopes.util";

describe("Util: resolveMcpAuthorizationScopes", () => {
  it("should ignore blank entries, as an empty scope parameter splits into one", () => {
    expect(resolveMcpAuthorizationScopes([""])).toEqual([
      MCP_SCOPE_READ,
      MCP_SCOPE_WRITE,
    ]);
    expect(resolveMcpAuthorizationScopes(["", MCP_SCOPE_READ])).toEqual([
      MCP_SCOPE_READ,
    ]);
  });

  it.each([[undefined], [[]]])(
    "should give the default scopes, never admin, when the client asks for %j",
    requested => {
      expect(resolveMcpAuthorizationScopes(requested)).toEqual([
        MCP_SCOPE_READ,
        MCP_SCOPE_WRITE,
      ]);
    },
  );

  it("should keep only what was asked, once each, in a fixed order", () => {
    expect(
      resolveMcpAuthorizationScopes([
        MCP_SCOPE_ADMIN,
        MCP_SCOPE_READ,
        MCP_SCOPE_ADMIN,
      ]),
    ).toEqual([MCP_SCOPE_READ, MCP_SCOPE_ADMIN]);
  });

  it("should refuse a scope the server does not know, naming it", () => {
    expect(() =>
      resolveMcpAuthorizationScopes([MCP_SCOPE_READ, "autodroid:root"]),
    ).toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_scopes/INVALID_SCOPE",
        message: "Unknown scope: autodroid:root.",
        statusCode: 400,
      }),
    );
  });
});

describe("Util: grantableMcpAuthorizationScopes", () => {
  const asked = [MCP_SCOPE_READ, MCP_SCOPE_WRITE, MCP_SCOPE_ADMIN];

  it("should grant everything asked to an administrator", () => {
    expect(grantableMcpAuthorizationScopes(asked, true)).toEqual(asked);
  });

  it("should leave the admin scope out for anyone else", () => {
    expect(grantableMcpAuthorizationScopes(asked, false)).toEqual([
      MCP_SCOPE_READ,
      MCP_SCOPE_WRITE,
    ]);
  });
});

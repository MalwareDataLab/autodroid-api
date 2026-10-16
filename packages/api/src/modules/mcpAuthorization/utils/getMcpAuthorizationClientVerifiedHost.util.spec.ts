import { describe, expect, it } from "vitest";

// Target import
import { getMcpAuthorizationClientVerifiedHost } from "./getMcpAuthorizationClientVerifiedHost.util";

describe("Util: getMcpAuthorizationClientVerifiedHost", () => {
  it("should give the host of a metadata-document client, whose document that host served", () => {
    expect(
      getMcpAuthorizationClientVerifiedHost(
        "https://agent.example.com/.well-known/mcp-client.json",
      ),
    ).toBe("agent.example.com");
  });

  it("should keep a non-default port, since the document was served from that exact origin", () => {
    expect(
      getMcpAuthorizationClientVerifiedHost(
        "https://agent.example.com:8443/client.json",
      ),
    ).toBe("agent.example.com:8443");
  });

  it("should give no host for a dynamically registered client, whose details nobody vouched for", () => {
    expect(
      getMcpAuthorizationClientVerifiedHost(
        "mcpc1.eyJyZWRpcmVjdF91cmlzIjpbImh0dHBzOi8vZXZpbC5leGFtcGxlL2NiIl19.signature",
      ),
    ).toBeNull();
  });
});

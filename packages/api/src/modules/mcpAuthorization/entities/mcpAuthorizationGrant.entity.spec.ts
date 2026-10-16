import "reflect-metadata";

import { instanceToPlain, plainToInstance } from "class-transformer";
import { describe, expect, it } from "vitest";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Target import
import { McpAuthorizationGrant } from "./mcpAuthorizationGrant.entity";

describe("Entity: McpAuthorizationGrant", () => {
  it("should vouch for a metadata-document client by the host that published its document", () => {
    const grant = plainToInstance(McpAuthorizationGrant, {
      client_id: "https://agent.example.com:8443/oauth/client.json",
    });

    expect(grant.client_verified_host).toBe("agent.example.com:8443");
    expect(instanceToPlain(grant)).toEqual({
      client_id: "https://agent.example.com:8443/oauth/client.json",
      client_verified_host: "agent.example.com:8443",
    });
  });

  it("should vouch for no host for a dynamically registered client", () => {
    const grant = plainToInstance(McpAuthorizationGrant, {
      client_id: "mcpc1.abc.def",
    });

    expect(grant.client_verified_host).toBeNull();
  });

  it("should hydrate its user as a User when parsed from a record and keep it out of the serialized grant", () => {
    const grant = parse(McpAuthorizationGrant, {
      client_id: "mcpc1.abc.def",
      user: { id: "user-1" },
    });

    expect(grant.user).toBeInstanceOf(User);
    expect(grant.user).toMatchObject({ id: "user-1" });
    expect(instanceToPlain(grant)).toEqual({
      client_id: "mcpc1.abc.def",
      client_verified_host: null,
    });
  });
});

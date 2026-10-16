import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Target import
import { mcpAuthorizationRouter } from "./mcpAuthorization.routes";

vi.mock("@config/mcp", () => ({ getMcpConfig: vi.fn() }));

const mountPath = (layer: any) =>
  layer.regexp.source
    .replace(/^\^/, "")
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, "")
    .replace(/\\\//g, "/")
    .replace(/\\\./g, ".");

const allMountPaths = () =>
  (mcpAuthorizationRouter as any).stack.map((layer: any) => mountPath(layer));

describe("Routes: mcp authorization (OAuth + discovery)", () => {
  it("should mount discovery metadata and every OAuth handler, in order", () => {
    expect(allMountPaths()).toEqual([
      "/.well-known/oauth-authorization-server",
      "/.well-known/oauth-protected-resource/mcp",
      "/oauth/authorize",
      "/oauth/authorize",
      "/oauth/token",
      "/oauth/register",
      "/oauth/register",
      "/oauth/revoke",
    ]);
  });

  describe("request-time discovery metadata", () => {
    const MCP_CONFIG = {
      issuer: "https://api.autodroid.example",
      resource: "https://api.autodroid.example/mcp",
      resourceName: "AutoDroid",
      authorizationEndpoint: "https://api.autodroid.example/oauth/authorize",
      tokenEndpoint: "https://api.autodroid.example/oauth/token",
      registrationEndpoint: "https://api.autodroid.example/oauth/register",
      revocationEndpoint: "https://api.autodroid.example/oauth/revoke",
    } as ReturnType<typeof getMcpConfig>;

    const app = () => {
      vi.mocked(getMcpConfig).mockReturnValue(MCP_CONFIG);
      return express().use(mcpAuthorizationRouter);
    };

    it("should describe the authorization server from the configured endpoints", async () => {
      const response = await request(app()).get(
        "/.well-known/oauth-authorization-server",
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        issuer: MCP_CONFIG.issuer,
        authorization_endpoint: MCP_CONFIG.authorizationEndpoint,
        token_endpoint: MCP_CONFIG.tokenEndpoint,
        registration_endpoint: MCP_CONFIG.registrationEndpoint,
        revocation_endpoint: MCP_CONFIG.revocationEndpoint,
        scopes_supported: [
          "autodroid:read",
          "autodroid:write",
          "autodroid:admin",
        ],
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"],
        revocation_endpoint_auth_methods_supported: ["none"],
        client_id_metadata_document_supported: true,
        authorization_response_iss_parameter_supported: true,
      });
    });

    it("should describe the protected resource at its path-suffixed well-known URI", async () => {
      const response = await request(app()).get(
        "/.well-known/oauth-protected-resource/mcp",
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        resource: MCP_CONFIG.resource,
        authorization_servers: [MCP_CONFIG.issuer],
        scopes_supported: [
          "autodroid:read",
          "autodroid:write",
          "autodroid:admin",
        ],
        bearer_methods_supported: ["header"],
        resource_name: MCP_CONFIG.resourceName,
      });
    });
  });
});

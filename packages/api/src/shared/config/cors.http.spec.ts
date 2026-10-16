import cors from "cors";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";

// Target import
import { getCorsOptionsDelegate } from "./cors";

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

const buildApp = () => {
  const app = express();
  app.use(cors(getCorsOptionsDelegate()));
  app.all("*", (_req, res) => res.status(200).json({ ok: true }));
  return app;
};

const preflight = (path: string, origin: string) =>
  request(buildApp())
    .options(path)
    .set("Origin", origin)
    .set("Access-Control-Request-Method", "POST")
    .set("Access-Control-Request-Headers", "authorization,content-type");

describe("Config: CORS as a browser sees it, in production", () => {
  beforeEach(() => {
    vi.mocked(getEnvConfig).mockReturnValue(
      getEnvConfigMockValue({
        NODE_ENV: "production",
        CORS_ALLOWED_FROM: "https://app.example.com",
      }),
    );
  });

  it.each(["/oauth/token", "/oauth/register", "/oauth/revoke"])(
    "should let a browser client on an unlisted origin pass the %s preflight, without credentials",
    async path => {
      const response = await preflight(path, "https://unlisted.example");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe("*");
      expect(
        response.headers["access-control-allow-credentials"],
      ).toBeUndefined();
    },
  );

  it("should let a browser client on an unlisted origin read the discovery documents", async () => {
    const response = await request(buildApp())
      .get("/.well-known/oauth-protected-resource/mcp")
      .set("Origin", "https://unlisted.example");

    expect(response.headers["access-control-allow-origin"]).toBe("*");
  });

  it("should refuse an unlisted origin on /mcp, which stays on the allowlist", async () => {
    const response = await preflight("/mcp", "https://unlisted.example");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("should still allow a listed origin on /mcp, with credentials", async () => {
    const response = await preflight("/mcp", "https://app.example.com");

    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://app.example.com",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("should let a browser on an allowed origin read the WWW-Authenticate header of an MCP answer", async () => {
    const response = await request(buildApp())
      .get("/mcp")
      .set("Origin", "https://app.example.com");

    expect(response.headers["access-control-expose-headers"]).toBe(
      "WWW-Authenticate",
    );
  });
});

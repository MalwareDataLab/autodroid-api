import { createHash, randomBytes } from "node:crypto";
import http from "node:http";
import { AddressInfo } from "node:net";
import { chromium } from "@playwright/test";
import { describe, expect, it } from "vitest";

const REDIRECT_URI = "https://client.example.com/callback";

const makePkcePair = () => {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
};

const startCrossOriginPage = (): Promise<{
  origin: string;
  close: () => Promise<void>;
}> =>
  new Promise(resolve => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<!doctype html><html><body>cross-origin test page</body></html>",
      );
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>(closeResolve => {
            server.closeAllConnections();
            server.close(() => closeResolve());
          }),
      });
    });
  });

describe("E2E (real browser via Playwright): MCP OAuth CORS + redirect behavior", () => {
  it("should let a real cross-origin browser fetch complete discovery and DCR registration, and observe a well-formed authorize redirect — proving real browser CORS enforcement passes, not just that the server sends the right headers", async context => {
    await new Promise<void>(resolve => {
      context.app.httpServer.listen(0, "127.0.0.1", resolve);
    });
    const { port } = context.app.httpServer.address() as AddressInfo;
    const apiOrigin = `http://127.0.0.1:${port}`;

    const crossOriginPage = await startCrossOriginPage();
    const browser = await chromium.launch();

    try {
      const page = await browser.newPage();
      await page.goto(crossOriginPage.origin);

      const discoveryResult = await page.evaluate(async url => {
        const response = await fetch(url);
        return { status: response.status, body: await response.json() };
      }, `${apiOrigin}/.well-known/oauth-authorization-server`);
      expect(discoveryResult.status).toBe(200);
      expect(discoveryResult.body.client_id_metadata_document_supported).toBe(
        true,
      );

      const protectedResourceResult = await page.evaluate(async url => {
        const response = await fetch(url);
        return { status: response.status, body: await response.json() };
      }, `${apiOrigin}/.well-known/oauth-protected-resource/mcp`);
      expect(protectedResourceResult.status).toBe(200);
      expect(protectedResourceResult.body.authorization_servers).toHaveLength(
        1,
      );

      const registerResult = await page.evaluate(
        async ({ url, body }) => {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          return { status: response.status, body: await response.json() };
        },
        {
          url: `${apiOrigin}/oauth/register`,
          body: {
            redirect_uris: [REDIRECT_URI],
            client_name: "Playwright Browser Test Client",
            token_endpoint_auth_method: "none",
          },
        },
      );
      expect(registerResult.status).toBe(201);
      expect(registerResult.body.client_id).toMatch(/^mcpc1\./);
      const { client_id } = registerResult.body;

      const { challenge } = makePkcePair();
      const authorizeUrl = new URL(`${apiOrigin}/oauth/authorize`);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("client_id", client_id);
      authorizeUrl.searchParams.set("code_challenge", challenge);
      authorizeUrl.searchParams.set("code_challenge_method", "S256");
      authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI);

      let redirectLocation: string | undefined;
      page.on("response", response => {
        if (response.url() === authorizeUrl.href) {
          redirectLocation = response.headers().location;
        }
      });

      await page
        .goto(authorizeUrl.href, { waitUntil: "commit" })
        .catch(() => undefined);

      expect(redirectLocation).toBeTruthy();
      const redirectUrl = new URL(redirectLocation!);
      expect(redirectUrl.searchParams.get("request_id")).toBeTruthy();
    } finally {
      await browser.close();
      await crossOriginPage.close();
    }
  });
});

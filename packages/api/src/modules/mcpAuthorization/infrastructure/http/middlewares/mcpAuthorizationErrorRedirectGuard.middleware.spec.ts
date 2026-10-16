import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

// Target import
import { mcpAuthorizationErrorRedirectGuardMiddleware } from "./mcpAuthorizationErrorRedirectGuard.middleware";

const buildResponse = () => {
  const redirect = vi.fn();
  const json = vi.fn();
  const status = vi.fn();
  const response = { redirect, json, status } as unknown as Response;
  status.mockReturnValue(response);
  return { response, redirect, json, status };
};

const run = (response: Response) => {
  const next = vi.fn();
  mcpAuthorizationErrorRedirectGuardMiddleware({} as Request, response, next);
  return next;
};

describe("Middleware: mcpAuthorizationErrorRedirectGuard", () => {
  it("should continue the chain", () => {
    const { response } = buildResponse();

    const next = run(response);

    expect(next).toHaveBeenCalledOnce();
  });

  it("should answer an error redirect with a direct 400 carrying the OAuth error, never redirecting", () => {
    const { response, redirect, json, status } = buildResponse();
    const originalRedirect = response.redirect;
    run(response);

    response.redirect(
      302,
      "https://client.example.com/callback?error=invalid_request&error_description=Bad+scope&state=s",
    );

    expect(originalRedirect).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: "invalid_request",
      error_description: "Bad scope",
    });
  });

  it("should omit the description when the redirect carried none", () => {
    const { response, json } = buildResponse();
    run(response);

    response.redirect("https://client.example.com/callback?error=server_error");

    expect(json).toHaveBeenCalledWith({ error: "server_error" });
  });

  it("should pass a successful redirect through untouched, in either argument order", () => {
    const { response, redirect } = buildResponse();
    run(response);

    const redirectWith = response.redirect as (...args: unknown[]) => void;
    redirectWith(302, "https://app.example.com/mcp/authorize?request_id=r");
    redirectWith("https://app.example.com/mcp/authorize?request_id=r", 302);

    expect(redirect).toHaveBeenNthCalledWith(
      1,
      302,
      "https://app.example.com/mcp/authorize?request_id=r",
    );
    expect(redirect).toHaveBeenNthCalledWith(
      2,
      "https://app.example.com/mcp/authorize?request_id=r",
      302,
    );
  });
});

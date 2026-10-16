import type { RequestHandler, Response } from "express";

const mcpAuthorizationErrorRedirectGuardMiddleware: RequestHandler = (
  _req,
  res,
  next,
) => {
  const originalRedirect = res.redirect.bind(res) as (
    ...args: unknown[]
  ) => void;

  (res as Response).redirect = ((...args: unknown[]) => {
    const target = args.find(arg => typeof arg === "string") as string;
    const error = new URL(target).searchParams;

    if (!error.has("error")) return originalRedirect(...args);

    const body: Record<string, string> = { error: error.get("error")! };
    if (error.has("error_description"))
      body.error_description = error.get("error_description")!;

    return res.status(400).json(body);
  }) as Response["redirect"];

  next();
};

export { mcpAuthorizationErrorRedirectGuardMiddleware };

import { describe, expect, it, vi } from "vitest";

// Middleware import
import { ensureSamlAuthenticated } from "./middlewares";

describe("Middleware: ensureSamlAuthenticated", () => {
  it("should call next when the request is authenticated", () => {
    const next = vi.fn();
    const res: any = { redirect: vi.fn() };
    const req: any = { isAuthenticated: () => true };

    ensureSamlAuthenticated(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("should redirect to discovery when the request is not authenticated", () => {
    const next = vi.fn();
    const res: any = { redirect: vi.fn() };
    const req: any = { isAuthenticated: () => false };

    ensureSamlAuthenticated(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith("/rnp-cafe-saml/discovery");
  });
});

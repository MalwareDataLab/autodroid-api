import { describe, expect, it } from "vitest";

// Target import
import { isMcpAuthorizationRedirectUriAllowed } from "./isMcpAuthorizationRedirectUriAllowed.util";

describe("Util: isMcpAuthorizationRedirectUriAllowed", () => {
  it("should allow an https redirect on any host", () => {
    expect(
      isMcpAuthorizationRedirectUriAllowed("https://client.example.com/cb"),
    ).toBe(true);
  });

  it.each([
    "http://127.0.0.1:3118/callback",
    "http://[::1]:3118/callback",
    "http://localhost:3118/callback",
  ])(
    "should allow an http redirect on the loopback address %s",
    redirectUri => {
      expect(isMcpAuthorizationRedirectUriAllowed(redirectUri)).toBe(true);
    },
  );

  it("should refuse an http redirect on a host that is not a loopback address", () => {
    expect(
      isMcpAuthorizationRedirectUriAllowed("http://client.example.com/cb"),
    ).toBe(false);
  });

  it("should refuse an http redirect on a loopback-looking subdomain", () => {
    expect(
      isMcpAuthorizationRedirectUriAllowed("http://localhost.example.com/cb"),
    ).toBe(false);
  });

  it("should refuse a scheme other than https or http, even on a loopback host", () => {
    expect(
      isMcpAuthorizationRedirectUriAllowed("ftp://127.0.0.1/callback"),
    ).toBe(false);
  });

  it("should refuse a custom application scheme", () => {
    expect(isMcpAuthorizationRedirectUriAllowed("myapp://callback")).toBe(
      false,
    );
  });

  it("should throw when the redirect is not a URL at all", () => {
    expect(() => isMcpAuthorizationRedirectUriAllowed("not a url")).toThrow(
      TypeError,
    );
  });
});

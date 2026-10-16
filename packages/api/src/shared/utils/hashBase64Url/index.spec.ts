import { describe, expect, it } from "vitest";

// Target import
import { hashBase64Url } from ".";

describe("Utils: hashBase64Url", () => {
  it("should give the base64url SHA-256 digest of the value, unpadded", () => {
    expect(hashBase64Url("autodroid")).toBe(
      "llPliHbjx80oyozaObmfwiFbkxfDgYcubJOxdyLQLno",
    );
  });

  it("should turn the RFC 7636 example verifier into its example challenge", () => {
    expect(hashBase64Url("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
});

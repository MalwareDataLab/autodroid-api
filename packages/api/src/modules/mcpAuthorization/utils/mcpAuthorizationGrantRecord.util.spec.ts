import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Target import
import {
  getMcpAuthorizationHeldScopes,
  isMcpAuthorizationGrantLive,
} from "./mcpAuthorizationGrantRecord.util";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("Util: mcpAuthorizationGrantRecord", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isMcpAuthorizationGrantLive", () => {
    const grant = { token_generation: 2, scopes: ["scope-a"] };

    it("should accept a grant on the generation the record was issued for before the absolute expiry", () => {
      expect(
        isMcpAuthorizationGrantLive(grant, {
          token_generation: 2,
          grant_expires_at: NOW.getTime() + 1,
        }),
      ).toBe(true);
    });

    it.each([
      ["no grant row", null],
      ["no grant row at all", undefined],
    ])("should refuse %s", (_label, missing) => {
      expect(
        isMcpAuthorizationGrantLive(missing, {
          token_generation: 2,
          grant_expires_at: NOW.getTime() + 1,
        }),
      ).toBe(false);
    });

    it("should refuse a record issued before the grant was revoked and re-approved", () => {
      expect(
        isMcpAuthorizationGrantLive(grant, {
          token_generation: 1,
          grant_expires_at: NOW.getTime() + 1,
        }),
      ).toBe(false);
    });

    it("should refuse a record exactly on its absolute expiry", () => {
      expect(
        isMcpAuthorizationGrantLive(grant, {
          token_generation: 2,
          grant_expires_at: NOW.getTime(),
        }),
      ).toBe(false);
    });
  });

  describe("getMcpAuthorizationHeldScopes", () => {
    it("should keep only the record scopes the grant still holds, in record order", () => {
      expect(
        getMcpAuthorizationHeldScopes(
          { token_generation: 0, scopes: ["scope-c", "scope-a"] },
          { scopes: ["scope-a", "scope-b", "scope-c"] },
        ),
      ).toEqual(["scope-a", "scope-c"]);
    });

    it("should hold nothing once the grant dropped every record scope", () => {
      expect(
        getMcpAuthorizationHeldScopes(
          { token_generation: 0, scopes: ["scope-z"] },
          { scopes: ["scope-a"] },
        ),
      ).toEqual([]);
    });
  });
});

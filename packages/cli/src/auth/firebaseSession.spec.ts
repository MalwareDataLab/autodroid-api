import { beforeEach, describe, expect, it, vi } from "vitest";

// Target import
import {
  decodeTokenExpiration,
  getValidSession,
  refreshSession,
  signInWithPassword,
} from "./firebaseSession";

const encodeToken = (payload: Record<string, unknown>) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;

describe("CLI: firebaseSession", () => {
  const apiKey = "web-api-key";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("decodeTokenExpiration", () => {
    it("should read the expiration claim in milliseconds", () => {
      const token = encodeToken({ exp: 1700000000 });

      expect(decodeTokenExpiration(token)).toBe(1700000000 * 1000);
    });

    it("should reject a token without three segments", () => {
      expect(() => decodeTokenExpiration("not-a-jwt")).toThrowError(
        "Malformed Firebase token.",
      );
    });

    it("should reject a token whose payload carries no expiration", () => {
      expect(() => decodeTokenExpiration(encodeToken({}))).toThrowError(
        "Firebase token has no expiration claim.",
      );
    });

    it("should reject a token whose payload is not readable", () => {
      expect(() => decodeTokenExpiration("header.@@@.signature")).toThrowError(
        "Malformed Firebase token.",
      );
    });
  });

  describe("signInWithPassword", () => {
    it("should exchange the credentials for a session", async () => {
      const idToken = encodeToken({ exp: 1700000000 });
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ idToken, refreshToken: "refresh-1" }),
      } as Response);

      const session = await signInWithPassword({
        email: "user@example.test",
        password: "secret",
        apiKey,
      });

      expect(session).toEqual({
        idToken,
        refreshToken: "refresh-1",
        expiresAt: 1700000000 * 1000,
      });
      expect(fetch).toHaveBeenCalledWith(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "user@example.test",
            password: "secret",
            returnSecureToken: true,
          }),
        }),
      );
    });

    it("should surface the provider message when the credentials are rejected", async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ error: { message: "INVALID_PASSWORD" } }),
      } as Response);

      await expect(
        signInWithPassword({
          email: "user@example.test",
          password: "wrong",
          apiKey,
        }),
      ).rejects.toThrowError("Firebase sign in failed. INVALID_PASSWORD");
    });
  });

  describe("refreshSession", () => {
    it("should exchange the refresh token for a new session", async () => {
      const idToken = encodeToken({ exp: 1800000000 });
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ id_token: idToken, refresh_token: "refresh-2" }),
      } as Response);

      const session = await refreshSession({
        refreshToken: "refresh-1",
        apiKey,
      });

      expect(session).toEqual({
        idToken,
        refreshToken: "refresh-2",
        expiresAt: 1800000000 * 1000,
      });
      expect(fetch).toHaveBeenCalledWith(
        `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=refresh_token&refresh_token=refresh-1",
        }),
      );
    });

    it("should surface the provider message when the refresh token is rejected", async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ error: { message: "TOKEN_EXPIRED" } }),
      } as Response);

      await expect(
        refreshSession({ refreshToken: "stale", apiKey }),
      ).rejects.toThrowError("Firebase token refresh failed. TOKEN_EXPIRED");
    });
  });

  describe("getValidSession", () => {
    const session = {
      idToken: "current",
      refreshToken: "refresh-1",
      expiresAt: 2_000_000_000_000,
    };

    it("should keep a session that is not close to expiring", async () => {
      const result = await getValidSession({
        session,
        apiKey,
        now: session.expiresAt - 10 * 60 * 1000,
      });

      expect(result).toBe(session);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should refresh a session inside the renewal window", async () => {
      const idToken = encodeToken({ exp: 1900000000 });
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ id_token: idToken, refresh_token: "refresh-3" }),
      } as Response);

      const result = await getValidSession({
        session,
        apiKey,
        now: session.expiresAt - 60 * 1000,
      });

      expect(result.idToken).toBe(idToken);
      expect(result.refreshToken).toBe("refresh-3");
    });

    it("should refresh a session that already expired", async () => {
      const idToken = encodeToken({ exp: 1900000000 });
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ id_token: idToken, refresh_token: "refresh-4" }),
      } as Response);

      const result = await getValidSession({
        session,
        apiKey,
        now: session.expiresAt + 1,
      });

      expect(result.idToken).toBe(idToken);
    });
  });
});

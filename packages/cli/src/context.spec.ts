import { beforeEach, describe, expect, it, vi } from "vitest";

// Target import
import { getCliConfig, resolveIdToken } from "./context";

const h = vi.hoisted(() => ({
  readSession: vi.fn(),
  writeSession: vi.fn(),
  getValidSession: vi.fn(),
}));

vi.mock("./auth/sessionStore", () => ({
  readSession: h.readSession,
  writeSession: h.writeSession,
}));

vi.mock("./auth/firebaseSession", () => ({
  getValidSession: h.getValidSession,
}));

const session = {
  idToken: "id-token",
  refreshToken: "refresh-token",
  expiresAt: 2_000_000_000_000,
};

describe("CLI: context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("AUTODROID_CLI_API_URL", "https://api.example.test/graphql");
    vi.stubEnv("AUTODROID_CLI_FIREBASE_WEB_API_KEY", "web-api-key");
  });

  describe("getCliConfig", () => {
    it("should read the endpoint and the firebase key from the environment", () => {
      expect(getCliConfig()).toEqual({
        endpoint: "https://api.example.test/graphql",
        apiKey: "web-api-key",
      });
    });

    it("should refuse to run without an api url", () => {
      vi.stubEnv("AUTODROID_CLI_API_URL", "");

      expect(() => getCliConfig()).toThrowError(
        "AUTODROID_CLI_API_URL is required.",
      );
    });

    it("should refuse to run without a firebase web api key", () => {
      vi.stubEnv("AUTODROID_CLI_FIREBASE_WEB_API_KEY", "");

      expect(() => getCliConfig()).toThrowError(
        "AUTODROID_CLI_FIREBASE_WEB_API_KEY is required.",
      );
    });
  });

  describe("resolveIdToken", () => {
    it("should refuse when no session was stored", async () => {
      h.readSession.mockResolvedValue(null);

      await expect(resolveIdToken()).rejects.toThrowError(
        "Not authenticated. Run `autodroid login` first.",
      );
    });

    it("should return the stored token while it is still valid", async () => {
      h.readSession.mockResolvedValue(session);
      h.getValidSession.mockResolvedValue(session);

      await expect(resolveIdToken()).resolves.toBe("id-token");
      expect(h.writeSession).not.toHaveBeenCalled();
    });

    it("should persist the session when it had to be renewed", async () => {
      const renewed = { ...session, idToken: "renewed-token" };
      h.readSession.mockResolvedValue(session);
      h.getValidSession.mockResolvedValue(renewed);

      await expect(resolveIdToken()).resolves.toBe("renewed-token");
      expect(h.writeSession).toHaveBeenCalledWith(renewed);
    });
  });
});

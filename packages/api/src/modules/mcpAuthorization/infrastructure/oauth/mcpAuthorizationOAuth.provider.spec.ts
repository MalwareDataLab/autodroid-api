import {
  InvalidClientMetadataError,
  InvalidGrantError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidTokenError,
  ServerError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Error import
import { AppError } from "@shared/errors/AppError";

// Service import
import { McpAuthorizationAccessTokenVerifyService } from "@modules/mcpAuthorization/services/mcpAuthorizationAccessTokenVerify.service";
import { McpAuthorizationClientRegisterService } from "@modules/mcpAuthorization/services/mcpAuthorizationClientRegister.service";
import { McpAuthorizationClientResolveService } from "@modules/mcpAuthorization/services/mcpAuthorizationClientResolve.service";
import { McpAuthorizationCodeChallengeService } from "@modules/mcpAuthorization/services/mcpAuthorizationCodeChallenge.service";
import { McpAuthorizationCodeExchangeService } from "@modules/mcpAuthorization/services/mcpAuthorizationCodeExchange.service";
import { McpAuthorizationRequestCreateService } from "@modules/mcpAuthorization/services/mcpAuthorizationRequestCreate.service";
import { McpAuthorizationTokenRefreshService } from "@modules/mcpAuthorization/services/mcpAuthorizationTokenRefresh.service";
import { McpAuthorizationTokenRevokeService } from "@modules/mcpAuthorization/services/mcpAuthorizationTokenRevoke.service";

// Target import
import { McpAuthorizationOAuthProvider } from "./mcpAuthorizationOAuth.provider";

const CLIENT = { client_id: "mcpc1.abc.def", redirect_uris: [] } as any;

describe("Provider: McpAuthorizationOAuthProvider", () => {
  let services: Record<string, { execute: ReturnType<typeof vi.fn> }>;
  let provider: McpAuthorizationOAuthProvider;

  beforeEach(() => {
    services = {
      [McpAuthorizationClientResolveService.name]: { execute: vi.fn() },
      [McpAuthorizationClientRegisterService.name]: { execute: vi.fn() },
      [McpAuthorizationRequestCreateService.name]: { execute: vi.fn() },
      [McpAuthorizationCodeChallengeService.name]: { execute: vi.fn() },
      [McpAuthorizationCodeExchangeService.name]: { execute: vi.fn() },
      [McpAuthorizationTokenRefreshService.name]: { execute: vi.fn() },
      [McpAuthorizationAccessTokenVerifyService.name]: { execute: vi.fn() },
      [McpAuthorizationTokenRevokeService.name]: { execute: vi.fn() },
    };

    vi.spyOn(container, "resolve").mockImplementation(
      (token: any): any => services[token.name],
    );

    provider = new McpAuthorizationOAuthProvider();
  });

  describe("clientsStore.getClient", () => {
    it("should delegate to the client resolve service", async () => {
      services[
        McpAuthorizationClientResolveService.name
      ].execute.mockResolvedValueOnce(CLIENT);

      const result = await provider.clientsStore.getClient("mcpc1.abc.def");

      expect(
        services[McpAuthorizationClientResolveService.name].execute,
      ).toHaveBeenCalledWith({ client_id: "mcpc1.abc.def" });
      expect(result).toBe(CLIENT);
    });
  });

  describe("clientsStore.registerClient", () => {
    it("should delegate to the client register service", () => {
      services[
        McpAuthorizationClientRegisterService.name
      ].execute.mockReturnValueOnce(CLIENT);

      const result = provider.clientsStore.registerClient!(CLIENT);

      expect(
        services[McpAuthorizationClientRegisterService.name].execute,
      ).toHaveBeenCalledWith({
        redirect_uris: CLIENT.redirect_uris,
        client_name: CLIENT.client_name,
      });
      expect(result).toBe(CLIENT);
    });

    it("should map a 400 AppError to InvalidClientMetadataError", () => {
      services[
        McpAuthorizationClientRegisterService.name
      ].execute.mockImplementation(() => {
        throw new AppError({
          key: "@x/Y",
          message: "bad metadata",
          statusCode: 400,
        });
      });

      expect(() => provider.clientsStore.registerClient!(CLIENT)).toThrowError(
        InvalidClientMetadataError,
      );
    });

    it("should map a 500+ AppError to ServerError", () => {
      services[
        McpAuthorizationClientRegisterService.name
      ].execute.mockImplementation(() => {
        throw new AppError({ key: "@x/Y", message: "boom", statusCode: 500 });
      });

      expect(() => provider.clientsStore.registerClient!(CLIENT)).toThrowError(
        ServerError,
      );
    });

    it("should map a non-AppError to a generic ServerError", () => {
      services[
        McpAuthorizationClientRegisterService.name
      ].execute.mockImplementation(() => {
        throw new Error("unexpected");
      });

      expect(() => provider.clientsStore.registerClient!(CLIENT)).toThrowError(
        ServerError,
      );
    });
  });

  describe("authorize", () => {
    it("should redirect to the consent URL on success", async () => {
      services[
        McpAuthorizationRequestCreateService.name
      ].execute.mockResolvedValueOnce(
        "https://app.autodroid.example/mcp/authorize?request_id=abc",
      );
      const res = { redirect: vi.fn() } as any;

      await provider.authorize(
        CLIENT,
        { codeChallenge: "c", redirectUri: "r" },
        res,
      );

      expect(res.redirect).toHaveBeenCalledWith(
        302,
        "https://app.autodroid.example/mcp/authorize?request_id=abc",
      );
    });

    it("should map an unknown scope to InvalidScopeError without redirecting", async () => {
      services[
        McpAuthorizationRequestCreateService.name
      ].execute.mockRejectedValueOnce(
        new AppError({
          key: "@mcp_authorization_scopes/INVALID_SCOPE",
          message: "Unknown scope: openid.",
          statusCode: 400,
        }),
      );
      const res = { redirect: vi.fn() } as any;

      await expect(
        provider.authorize(
          CLIENT,
          { codeChallenge: "c", redirectUri: "r", scopes: ["openid"] },
          res,
        ),
      ).rejects.toThrowError(InvalidScopeError);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should map an AppError to InvalidTargetError without redirecting", async () => {
      services[
        McpAuthorizationRequestCreateService.name
      ].execute.mockRejectedValueOnce(
        new AppError({ key: "@x/Y", message: "bad resource", statusCode: 400 }),
      );
      const res = { redirect: vi.fn() } as any;

      await expect(
        provider.authorize(
          CLIENT,
          { codeChallenge: "c", redirectUri: "r" },
          res,
        ),
      ).rejects.toThrowError(InvalidTargetError);
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  describe("challengeForAuthorizationCode", () => {
    it("should return the stored challenge", async () => {
      services[
        McpAuthorizationCodeChallengeService.name
      ].execute.mockResolvedValueOnce("the-challenge");

      await expect(
        provider.challengeForAuthorizationCode(CLIENT, "code"),
      ).resolves.toBe("the-challenge");
    });

    it("should map an AppError to InvalidGrantError", async () => {
      services[
        McpAuthorizationCodeChallengeService.name
      ].execute.mockRejectedValueOnce(
        new AppError({ key: "@x/Y", message: "not found", statusCode: 400 }),
      );

      await expect(
        provider.challengeForAuthorizationCode(CLIENT, "code"),
      ).rejects.toThrowError(InvalidGrantError);
    });
  });

  describe("exchangeAuthorizationCode", () => {
    const tokens = { access_token: "at", token_type: "Bearer" };

    it("should return the minted tokens", async () => {
      services[
        McpAuthorizationCodeExchangeService.name
      ].execute.mockResolvedValueOnce(tokens);

      await expect(
        provider.exchangeAuthorizationCode(CLIENT, "code", "verifier", "uri"),
      ).resolves.toBe(tokens);
      expect(
        services[McpAuthorizationCodeExchangeService.name].execute,
      ).toHaveBeenCalledWith({
        client: CLIENT,
        authorizationCode: "code",
        redirectUri: "uri",
        resource: undefined,
      });
    });

    it("should map an AppError to InvalidGrantError", async () => {
      services[
        McpAuthorizationCodeExchangeService.name
      ].execute.mockRejectedValueOnce(
        new AppError({ key: "@x/Y", message: "mismatch", statusCode: 400 }),
      );

      await expect(
        provider.exchangeAuthorizationCode(CLIENT, "code"),
      ).rejects.toThrowError(InvalidGrantError);
    });
  });

  describe("exchangeRefreshToken", () => {
    const tokens = { access_token: "at2", token_type: "Bearer" };

    it("should return the reissued tokens", async () => {
      services[
        McpAuthorizationTokenRefreshService.name
      ].execute.mockResolvedValueOnce(tokens);

      await expect(
        provider.exchangeRefreshToken(CLIENT, "refresh"),
      ).resolves.toBe(tokens);
    });

    it("should pass the scopes the refresh asks for to the service", async () => {
      services[
        McpAuthorizationTokenRefreshService.name
      ].execute.mockResolvedValueOnce(tokens);

      await provider.exchangeRefreshToken(CLIENT, "refresh", [
        "autodroid:read",
      ]);

      expect(
        services[McpAuthorizationTokenRefreshService.name].execute,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ scopes: ["autodroid:read"] }),
      );
    });

    it("should map a scope the grant does not hold to InvalidScopeError", async () => {
      services[
        McpAuthorizationTokenRefreshService.name
      ].execute.mockRejectedValueOnce(
        new AppError({
          key: "@mcp_authorization_token_refresh_service/INVALID_SCOPE",
          message: "A refresh cannot widen the scopes the grant holds.",
          statusCode: 400,
        }),
      );

      await expect(
        provider.exchangeRefreshToken(CLIENT, "refresh", ["autodroid:admin"]),
      ).rejects.toThrowError(InvalidScopeError);
    });

    it("should map an AppError to InvalidGrantError", async () => {
      services[
        McpAuthorizationTokenRefreshService.name
      ].execute.mockRejectedValueOnce(
        new AppError({ key: "@x/Y", message: "invalid", statusCode: 400 }),
      );

      await expect(
        provider.exchangeRefreshToken(CLIENT, "refresh"),
      ).rejects.toThrowError(InvalidGrantError);
    });
  });

  describe("verifyAccessToken", () => {
    const authInfo = { token: "at", clientId: "mcpc1.abc.def", scopes: [] };

    it("should return the AuthInfo", async () => {
      services[
        McpAuthorizationAccessTokenVerifyService.name
      ].execute.mockResolvedValueOnce(authInfo);

      await expect(provider.verifyAccessToken("at")).resolves.toBe(authInfo);
    });

    it("should map an AppError to InvalidTokenError", async () => {
      services[
        McpAuthorizationAccessTokenVerifyService.name
      ].execute.mockRejectedValueOnce(
        new AppError({ key: "@x/Y", message: "not found", statusCode: 401 }),
      );

      await expect(provider.verifyAccessToken("at")).rejects.toThrowError(
        InvalidTokenError,
      );
    });
  });

  describe("revokeToken", () => {
    it("should delegate to the token revoke service", async () => {
      await provider.revokeToken(CLIENT, { token: "at" });

      expect(
        services[McpAuthorizationTokenRevokeService.name].execute,
      ).toHaveBeenCalledWith({ client: CLIENT, request: { token: "at" } });
    });
  });
});

import { Request, Response } from "express";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Service import
import { CliAuthorizationAuthorizeService } from "@modules/cliAuthorization/services/cliAuthorizationAuthorize.service";
import { CliAuthorizationRegisterService } from "@modules/cliAuthorization/services/cliAuthorizationRegister.service";
import { CliAuthorizationTokenRedeemService } from "@modules/cliAuthorization/services/cliAuthorizationTokenRedeem.service";

// Target import
import { CliAuthorizationController } from "./cliAuthorization.controller";

describe("Controller: CliAuthorizationController", () => {
  let cliAuthorizationRegisterService: { execute: ReturnType<typeof vi.fn> };
  let cliAuthorizationAuthorizeService: { execute: ReturnType<typeof vi.fn> };
  let cliAuthorizationTokenRedeemService: { execute: ReturnType<typeof vi.fn> };

  let response: { json: ReturnType<typeof vi.fn> };

  let cliAuthorizationController: CliAuthorizationController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user_auth_provider_conn: { code: "user-code-123" } },
      language: "en",
      body: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    cliAuthorizationRegisterService = { execute: vi.fn() };
    cliAuthorizationAuthorizeService = { execute: vi.fn() };
    cliAuthorizationTokenRedeemService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === CliAuthorizationRegisterService)
        return cliAuthorizationRegisterService;
      if (token === CliAuthorizationAuthorizeService)
        return cliAuthorizationAuthorizeService;
      if (token === CliAuthorizationTokenRedeemService)
        return cliAuthorizationTokenRedeemService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    cliAuthorizationController = new CliAuthorizationController();
  });

  describe("register", () => {
    it("should register the challenge/user-code mapping and confirm success", async () => {
      cliAuthorizationRegisterService.execute.mockResolvedValueOnce(undefined);

      const result = await cliAuthorizationController.register(
        buildRequest({
          body: { code_challenge: "a".repeat(43), user_code: "ABCDEFGH" },
        }),
        response as unknown as Response,
      );

      expect(cliAuthorizationRegisterService.execute).toHaveBeenCalledWith({
        code_challenge: "a".repeat(43),
        user_code: "ABCDEFGH",
      });
      expect(response.json).toHaveBeenCalledWith({ success: true });
      expect(result).toBe(response);
    });

    it("should propagate a failure registering the mapping", async () => {
      const error = new Error("register failed");
      cliAuthorizationRegisterService.execute.mockRejectedValueOnce(error);

      await expect(
        cliAuthorizationController.register(
          buildRequest({
            body: { code_challenge: "a".repeat(43), user_code: "ABCDEFGH" },
          }),
          response as unknown as Response,
        ),
      ).rejects.toThrowError(error);
      expect(response.json).not.toHaveBeenCalled();
    });
  });

  describe("authorize", () => {
    it("should authorize the user code for the current session and confirm success", async () => {
      cliAuthorizationAuthorizeService.execute.mockResolvedValueOnce(undefined);

      const result = await cliAuthorizationController.authorize(
        buildRequest({ body: { user_code: "ABCDEFGH" } }),
        response as unknown as Response,
      );

      expect(cliAuthorizationAuthorizeService.execute).toHaveBeenCalledWith({
        user_code: "ABCDEFGH",
        user_auth_provider_conn: { code: "user-code-123" },
        language: "en",
      });
      expect(response.json).toHaveBeenCalledWith({ success: true });
      expect(result).toBe(response);
    });

    it("should propagate a failure authorizing the user code", async () => {
      const error = new Error("authorize failed");
      cliAuthorizationAuthorizeService.execute.mockRejectedValueOnce(error);

      await expect(
        cliAuthorizationController.authorize(
          buildRequest({ body: { user_code: "ABCDEFGH" } }),
          response as unknown as Response,
        ),
      ).rejects.toThrowError(error);
      expect(response.json).not.toHaveBeenCalled();
    });
  });

  describe("token", () => {
    it("should redeem the verifier and return the minted token", async () => {
      cliAuthorizationTokenRedeemService.execute.mockResolvedValueOnce(
        "minted-token",
      );

      const result = await cliAuthorizationController.token(
        buildRequest({ body: { code_verifier: "b".repeat(43) } }),
        response as unknown as Response,
      );

      expect(cliAuthorizationTokenRedeemService.execute).toHaveBeenCalledWith({
        code_verifier: "b".repeat(43),
      });
      expect(response.json).toHaveBeenCalledWith({ token: "minted-token" });
      expect(result).toBe(response);
    });

    it("should propagate a failure redeeming the verifier", async () => {
      const error = new Error("redeem failed");
      cliAuthorizationTokenRedeemService.execute.mockRejectedValueOnce(error);

      await expect(
        cliAuthorizationController.token(
          buildRequest({ body: { code_verifier: "b".repeat(43) } }),
          response as unknown as Response,
        ),
      ).rejects.toThrowError(error);
      expect(response.json).not.toHaveBeenCalled();
    });
  });
});

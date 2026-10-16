import { Request, Response } from "express";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Service import
import { McpAuthorizationRequestDecideService } from "@modules/mcpAuthorization/services/mcpAuthorizationRequestDecide.service";
import { McpAuthorizationRequestShowService } from "@modules/mcpAuthorization/services/mcpAuthorizationRequestShow.service";

// Target import
import { McpAuthorizationRequestController } from "./mcpAuthorizationRequest.controller";

describe("Controller: McpAuthorizationRequestController", () => {
  let mcpAuthorizationRequestShowService: { execute: ReturnType<typeof vi.fn> };
  let mcpAuthorizationRequestDecideService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let response: {
    json: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
  };

  let mcpAuthorizationRequestController: McpAuthorizationRequestController;

  const REQUEST_ID = "a".repeat(43);

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      params: { request_id: REQUEST_ID },
      user_session: {
        is_admin: true,
        user_auth_provider_conn: { id: "conn-1" },
      },
      body: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    mcpAuthorizationRequestShowService = { execute: vi.fn() };
    mcpAuthorizationRequestDecideService = { execute: vi.fn() };

    response = {
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === McpAuthorizationRequestShowService)
        return mcpAuthorizationRequestShowService;
      if (token === McpAuthorizationRequestDecideService)
        return mcpAuthorizationRequestDecideService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    mcpAuthorizationRequestController = new McpAuthorizationRequestController();
  });

  describe("show", () => {
    it("should return the request details with no-store caching", async () => {
      const details = { client_name: "Example MCP Client" };
      mcpAuthorizationRequestShowService.execute.mockResolvedValueOnce(details);

      const result = await mcpAuthorizationRequestController.show(
        buildRequest(),
        response as unknown as Response,
      );

      expect(mcpAuthorizationRequestShowService.execute).toHaveBeenCalledWith({
        request_id: REQUEST_ID,
        is_admin: true,
      });
      expect(response.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-store",
      );
      expect(response.json).toHaveBeenCalledWith(details);
      expect(result).toBe(response);
    });

    it("should propagate a failure showing the request", async () => {
      const error = new Error("show failed");
      mcpAuthorizationRequestShowService.execute.mockRejectedValueOnce(error);

      await expect(
        mcpAuthorizationRequestController.show(
          buildRequest(),
          response as unknown as Response,
        ),
      ).rejects.toThrowError(error);
      expect(response.json).not.toHaveBeenCalled();
    });
  });

  describe("decide", () => {
    it("should record the decision for the signed-in user and return the redirect target", async () => {
      mcpAuthorizationRequestDecideService.execute.mockResolvedValueOnce({
        redirect_to: "https://client.example.com/callback?code=abc",
      });

      const result = await mcpAuthorizationRequestController.decide(
        buildRequest({ body: { approve: true } }),
        response as unknown as Response,
      );

      expect(mcpAuthorizationRequestDecideService.execute).toHaveBeenCalledWith(
        {
          request_id: REQUEST_ID,
          approve: true,
          is_admin: true,
          user_auth_provider_conn: { id: "conn-1" },
        },
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-store",
      );
      expect(response.json).toHaveBeenCalledWith({
        redirect_to: "https://client.example.com/callback?code=abc",
      });
      expect(result).toBe(response);
    });

    it("should propagate a failure recording the decision", async () => {
      const error = new Error("decide failed");
      mcpAuthorizationRequestDecideService.execute.mockRejectedValueOnce(error);

      await expect(
        mcpAuthorizationRequestController.decide(
          buildRequest({ body: { approve: false } }),
          response as unknown as Response,
        ),
      ).rejects.toThrowError(error);
      expect(response.json).not.toHaveBeenCalled();
    });
  });
});

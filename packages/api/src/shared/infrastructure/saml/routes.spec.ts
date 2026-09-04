import { beforeEach, describe, expect, it, vi } from "vitest";

// Route import
import "./routes";

const { routeRegistry, authenticateMock, federationManagerMock } = vi.hoisted(
  () => {
    const registry: Record<string, any[]> = {};
    const authenticate = vi.fn(() => vi.fn());
    return {
      routeRegistry: registry,
      authenticateMock: authenticate,
      federationManagerMock: {
        getPassport: vi.fn(() => ({ authenticate })),
        LOCAL_DISCOVERY_RESPONSE_URL: "http://app/rnp-cafe-saml/discovery",
        SAML_ISSUER: "http://app/rnp-cafe-saml/metadata",
        DISCOVERY_SERVICE_URL: "http://ds/WAYF.php",
        storeCustomTokenInSession: vi.fn(),
        getFrontendRedirectUrl: vi.fn(),
        getCustomTokenFromSession: vi.fn(),
        listIdps: vi.fn(() => ["idp-a", "idp-b"]),
        generateMetadata: vi.fn(() => "<xml/>"),
      },
    };
  },
);

vi.mock("express", () => ({
  Router: () => ({
    get: (path: string, ...handlers: any[]) => {
      routeRegistry[path] = handlers;
    },
    post: (path: string, ...handlers: any[]) => {
      routeRegistry[path] = handlers;
    },
  }),
}));

vi.mock("./strategy", () => ({ federationManager: federationManagerMock }));

const getHandler = (path: string) =>
  routeRegistry[path][routeRegistry[path].length - 1];

const buildResponse = () => {
  const res: any = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
    send: vi.fn(() => res),
    redirect: vi.fn(() => res),
    set: vi.fn(() => res),
  };
  return res;
};

describe("SAML: samlRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("/discovery", () => {
    it("should authenticate through passport when an idp is provided", () => {
      const res = buildResponse();
      const next = vi.fn();
      const req: any = { query: { idp: "idp-a" }, session: {} };

      getHandler("/discovery")(req, res, next);

      expect(req.session.idpEntityID).toBe("idp-a");
      expect(authenticateMock).toHaveBeenCalledWith("saml");
    });

    it("should redirect to the discovery service when no idp is provided", () => {
      const res = buildResponse();
      const req: any = { query: {}, session: {} };

      getHandler("/discovery")(req, res, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("http://ds/WAYF.php?entityID="),
      );
    });
  });

  describe("/callback", () => {
    it("should store the token and redirect to the frontend on success", async () => {
      const res = buildResponse();
      federationManagerMock.storeCustomTokenInSession.mockResolvedValueOnce(
        undefined,
      );
      federationManagerMock.getFrontendRedirectUrl.mockResolvedValueOnce(
        "http://frontend/auth/callback",
      );
      const req: any = { user: { uid: "user-id" } };

      await getHandler("/callback")(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        "http://frontend/auth/callback",
      );
    });

    it("should throw a callback failure when storing the token fails", async () => {
      const res = buildResponse();
      federationManagerMock.storeCustomTokenInSession.mockRejectedValueOnce(
        new Error("boom"),
      );

      await expect(
        getHandler("/callback")({ user: {} } as any, res),
      ).rejects.toThrowError(
        expect.objectContaining({ key: "@saml/callback_failed" }),
      );
    });
  });

  describe("/token", () => {
    it("should respond with the custom token when available", () => {
      const res = buildResponse();
      federationManagerMock.getCustomTokenFromSession.mockReturnValueOnce(
        "token-value",
      );

      getHandler("/token")({} as any, res);

      expect(res.json).toHaveBeenCalledWith({
        customToken: "token-value",
        provider: "saml",
      });
    });

    it("should throw a not found error when no token is available", () => {
      const res = buildResponse();
      federationManagerMock.getCustomTokenFromSession.mockReturnValueOnce(null);

      expect(() => getHandler("/token")({} as any, res)).toThrowError(
        expect.objectContaining({ key: "@saml/token_not_found" }),
      );
    });

    it("should throw a retrieval failure when the session lookup throws", () => {
      const res = buildResponse();
      federationManagerMock.getCustomTokenFromSession.mockImplementationOnce(
        () => {
          throw new Error("boom");
        },
      );

      expect(() => getHandler("/token")({} as any, res)).toThrowError(
        expect.objectContaining({ key: "@saml/token_retrieval_failed" }),
      );
    });
  });

  describe("/logout", () => {
    it("should redirect to the frontend logout page", () => {
      const res = buildResponse();
      process.env.FRONTEND_URL = "http://frontend";

      getHandler("/logout")({} as any, res);

      expect(res.redirect).toHaveBeenCalledWith("http://frontend/logout");
    });
  });

  describe("/idps", () => {
    it("should respond with the available idps and their count", () => {
      const res = buildResponse();

      getHandler("/idps")({} as any, res);

      expect(res.json).toHaveBeenCalledWith({
        availableIdPs: ["idp-a", "idp-b"],
        count: 2,
      });
    });
  });

  describe("/metadata", () => {
    it("should respond with the generated metadata as xml", () => {
      const res = buildResponse();

      getHandler("/metadata")({} as any, res);

      expect(res.set).toHaveBeenCalledWith("Content-Type", "application/xml");
      expect(res.send).toHaveBeenCalledWith("<xml/>");
    });
  });
});

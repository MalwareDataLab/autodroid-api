import { beforeEach, describe, expect, it, vi } from "vitest";

// Util import
import { logger } from "@shared/utils/logger";

// Strategy import
import { SamlFederationManager } from "./strategy";

const h = vi.hoisted(() => {
  process.env.SAML_PUBLIC_KEY =
    "-----BEGIN CERTIFICATE-----\\nSPCERT\\n-----END CERTIFICATE-----";
  process.env.SAML_PRIVATE_KEY =
    "-----BEGIN PRIVATE KEY-----\\nSPKEY\\n-----END PRIVATE KEY-----";

  const selectFn = vi.fn();
  const scheduleJob = vi.fn();
  const MultiSamlStrategy = vi.fn();
  const passportDefault = {
    use: vi.fn(),
    serializeUser: vi.fn(),
    deserializeUser: vi.fn(),
    authenticate: vi.fn(),
  };
  const MetadataReader = vi.fn(() => ({ entityId: "urn:idp:1" }));
  const toPassportConfig = vi.fn(() => ({}) as any);
  const buildFn = vi.fn(() => "<built/>");
  const XMLBuilder = vi.fn(() => ({ build: buildFn }));
  const resolveFn = vi.fn();
  const fetchMock = vi.fn();
  global.fetch = fetchMock as any;

  return {
    selectFn,
    scheduleJob,
    MultiSamlStrategy,
    passportDefault,
    MetadataReader,
    toPassportConfig,
    buildFn,
    XMLBuilder,
    resolveFn,
    fetchMock,
  };
});

vi.mock("@shared/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));
vi.mock("@node-saml/passport-saml", () => ({
  MultiSamlStrategy: h.MultiSamlStrategy,
}));
vi.mock("passport", () => ({ default: h.passportDefault }));
vi.mock("node-schedule", () => ({ default: { scheduleJob: h.scheduleJob } }));
vi.mock("xpath", () => ({
  default: { useNamespaces: () => h.selectFn },
  useNamespaces: () => h.selectFn,
}));
vi.mock("@xmldom/xmldom", () => ({
  DOMParser: vi.fn(() => ({ parseFromString: vi.fn(() => ({})) })),
  XMLSerializer: vi.fn(() => ({ serializeToString: vi.fn(() => "<idp/>") })),
}));
vi.mock("passport-saml-metadata", () => ({
  MetadataReader: h.MetadataReader,
  toPassportConfig: h.toPassportConfig,
}));
vi.mock("fast-xml-parser", () => ({ XMLBuilder: h.XMLBuilder }));
vi.mock("tsyringe", () => ({ container: { resolve: h.resolveFn } }));
vi.mock(
  "@modules/authentication/services/handleSamlToFirebaseAuthentication.service",
  () => ({ HandleSamlToFirebaseAuthenticationService: class {} }),
);

const createManager = async () => {
  const manager = new SamlFederationManager();
  await manager.initialization;
  vi.mocked(logger.info).mockClear();
  vi.mocked(logger.error).mockClear();
  return manager;
};

describe("SAML: SamlFederationManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.MetadataReader.mockImplementation(() => ({ entityId: "urn:idp:1" }));
    h.toPassportConfig.mockReturnValue({});
    h.buildFn.mockReturnValue("<built/>");
    h.selectFn.mockImplementation((expr: string) =>
      expr.includes("EntityDescriptor") ? [] : [],
    );
    h.fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<xml/>",
    });
  });

  describe("refreshMetadata", () => {
    it("should log an error when the service provider certificates are not configured", async () => {
      const manager = await createManager();
      (manager as any).SP_CERT = undefined;

      await manager.refreshMetadata();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("certificates not configured"),
      );
    });

    it("should log an error when the federation metadata request fails", async () => {
      const manager = await createManager();
      h.fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });

      await manager.refreshMetadata();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("HTTP error"),
      );
    });

    it("should abort the federation metadata request once the timeout elapses", async () => {
      const manager = await createManager();
      h.fetchMock.mockImplementationOnce(
        (_url: string, { signal }: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () =>
              reject(new Error("The operation was aborted")),
            );
          }),
      );

      vi.useFakeTimers();
      const refreshing = manager.refreshMetadata();
      await vi.advanceTimersByTimeAsync(5000);
      await refreshing;
      vi.useRealTimers();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("The operation was aborted"),
      );
    });

    it("should log an error when no IdP entities are found in the metadata", async () => {
      const manager = await createManager();
      h.selectFn.mockImplementation(() => null);

      await manager.refreshMetadata();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error processing SAML metadata"),
      );
    });

    it("should index an IdP from the passport config certificates handling multiple and non-string entries", async () => {
      const manager = await createManager();
      h.toPassportConfig.mockReturnValue({
        entryPoint: "https://idp/sso",
        logoutUrl: "https://idp/slo",
        idpCert: ["  RAW CERT  ", 222],
      });
      h.selectFn.mockImplementation((expr: string) =>
        expr.includes("EntityDescriptor") ? [{ node: true }] : [],
      );

      await manager.refreshMetadata();

      expect(manager.listIdps()).toEqual(["urn:idp:1"]);
      expect(manager.getConfig("urn:idp:1")).toMatchObject({
        entryPoint: "https://idp/sso",
        idpCert: ["RAWCERT", 222],
      });
      expect(manager.getIdpIndex()).toHaveProperty("urn:idp:1");
      expect(manager.getAttributeMap()).toHaveProperty("urn:oid:2.5.4.42");
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Loaded 1"),
      );
    });

    it("should fall back to the X509 certificate nodes when the config has no certificates", async () => {
      const manager = await createManager();
      h.toPassportConfig.mockReturnValue({ entryPoint: "https://idp/sso" });
      h.selectFn.mockImplementation((expr: string) =>
        expr.includes("EntityDescriptor")
          ? [{ node: true }]
          : [{ textContent: "CERT ONE" }],
      );

      await manager.refreshMetadata();

      expect(manager.getConfig("urn:idp:1")).toMatchObject({
        idpCert: "CERTONE",
      });
    });

    it("should skip an IdP that resolves to no certificates", async () => {
      const manager = await createManager();
      h.toPassportConfig.mockReturnValue({ entryPoint: "https://idp/sso" });
      h.selectFn.mockImplementation((expr: string) =>
        expr.includes("EntityDescriptor") ? [{ node: true }] : null,
      );

      await manager.refreshMetadata();

      expect(manager.listIdps()).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Loaded 0"),
      );
    });
  });

  describe("getConfig", () => {
    it("should throw when the requested IdP is not in the metadata", async () => {
      const manager = await createManager();

      expect(() => manager.getConfig("unknown")).toThrowError(
        "IdP unknown not found in metadata",
      );
    });
  });

  describe("scheduleRefresh", () => {
    it("should register a scheduled refresh job that swallows failures", async () => {
      const manager = await createManager();
      const scheduledCallback = h.scheduleJob.mock.calls.at(-1)?.[1] as (
        ...args: any[]
      ) => void;
      vi.spyOn(manager, "refreshMetadata").mockRejectedValueOnce(
        new Error("boom"),
      );

      await expect(
        (async () => scheduledCallback())(),
      ).resolves.toBeUndefined();
      await Promise.resolve();
    });
  });

  describe("generateMetadata", () => {
    it("should build the service provider metadata xml", async () => {
      const manager = await createManager();

      const metadata = manager.generateMetadata();

      expect(metadata).toBe("<built/>");
      expect(h.XMLBuilder).toHaveBeenCalled();
    });

    it("should throw when the certificates are not configured", async () => {
      const manager = await createManager();
      (manager as any).SP_KEY = undefined;

      expect(() => manager.generateMetadata()).toThrowError(
        "SAML certificates not configured",
      );
    });
  });

  describe("configurePassport", () => {
    const getStrategyArgs = () =>
      h.MultiSamlStrategy.mock.calls.at(-1) as any[];

    it("should resolve the saml options from the query idp", async () => {
      const manager = await createManager();
      (manager as any).idpIndex = { "idp-x": { entryPoint: "https://idp" } };
      const [options] = getStrategyArgs();
      const done = vi.fn();

      options.getSamlOptions({ query: { idp: "idp-x" } }, done);

      expect(done).toHaveBeenCalledWith(null, { entryPoint: "https://idp" });
    });

    it("should resolve the saml options from the session idp entity id", async () => {
      const manager = await createManager();
      (manager as any).idpIndex = { "idp-y": { entryPoint: "https://idp-y" } };
      const [options] = getStrategyArgs();
      const done = vi.fn();

      options.getSamlOptions(
        { query: {}, session: { idpEntityID: "idp-y" } },
        done,
      );

      expect(done).toHaveBeenCalledWith(null, { entryPoint: "https://idp-y" });
    });

    it("should fail the saml options when no idp is provided", async () => {
      await createManager();
      const [options] = getStrategyArgs();
      const done = vi.fn();

      options.getSamlOptions({ query: {}, session: {} }, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({ key: "@saml/NO_IDP_PROVIDED" }),
      );
    });

    it("should fail the saml options when the idp lookup throws", async () => {
      await createManager();
      const [options] = getStrategyArgs();
      const done = vi.fn();

      options.getSamlOptions({ query: { idp: "missing" }, session: {} }, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({ key: "@saml/ERROR_PROCESSING_IDP" }),
      );
    });

    it("should parse the user profile in the verify callback", async () => {
      await createManager();
      const [, verify] = getStrategyArgs();
      const done = vi.fn();

      verify({}, { "urn:oid:0.9.2342.19200300.100.1.1": "uid-1" }, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ uid: "uid-1" }),
      );
    });

    it("should resolve the logout verify callback with the name id", async () => {
      await createManager();
      const [, , logoutVerify] = getStrategyArgs();
      const done = vi.fn();

      logoutVerify({}, { nameID: "name-id" }, done);

      expect(done).toHaveBeenCalledWith(null, { nameID: "name-id" });
    });

    it("should serialize and deserialize the user as-is", async () => {
      await createManager();
      const serialize = h.passportDefault.serializeUser.mock.calls.at(
        -1,
      )?.[0] as any;
      const deserialize = h.passportDefault.deserializeUser.mock.calls.at(
        -1,
      )?.[0] as any;
      const serializeDone = vi.fn();
      const deserializeDone = vi.fn();

      serialize({ id: "user" }, serializeDone);
      deserialize({ id: "user" }, deserializeDone);

      expect(serializeDone).toHaveBeenCalledWith(null, { id: "user" });
      expect(deserializeDone).toHaveBeenCalledWith(null, { id: "user" });
    });

    it("should expose the passport instance", async () => {
      const manager = await createManager();

      expect(manager.getPassport()).toBe(h.passportDefault);
    });
  });

  describe("parseUserProfile", () => {
    it("should prefer the e-mail attribute when it is a valid email", async () => {
      const manager = await createManager();

      const parsed = manager.parseUserProfile({
        "urn:oid:0.9.2342.19200300.100.1.1": "uid-1",
        "urn:oid:0.9.2342.19200300.100.1.3": "mail@example.com",
        "urn:oid:2.5.4.42": "Given",
        "urn:oid:2.5.4.4": "Sur",
        "urn:oid:1.3.6.1.4.1.5923.1.1.1.6": "eppn",
        "urn:oid:1.3.6.1.4.1.1466.115.121.1.26": "primary@example.com",
        nameID: "name-id",
        unknownAttribute: "ignored",
      });

      expect(parsed).toMatchObject({
        uid: "uid-1",
        email: "primary@example.com",
        firstName: "Given",
        lastName: "Sur",
        username: "eppn",
        nameID: "name-id",
      });
    });

    it("should fall back to the mail attribute when the e-mail is invalid", async () => {
      const manager = await createManager();

      const parsed = manager.parseUserProfile({
        "urn:oid:0.9.2342.19200300.100.1.3": "mail@example.com",
        "urn:oid:1.3.6.1.4.1.1466.115.121.1.26": "not-an-email",
      });

      expect(parsed.email).toBe("mail@example.com");
    });
  });

  describe("createFirebaseCustomToken", () => {
    it("should return the custom token from the authentication service", async () => {
      const manager = await createManager();
      h.resolveFn.mockReturnValue({
        execute: vi.fn().mockResolvedValue({ customToken: "custom-token" }),
      });

      const token = await manager.createFirebaseCustomToken({
        uid: "uid",
      } as any);

      expect(token).toBe("custom-token");
    });

    it("should throw when the authentication service fails", async () => {
      const manager = await createManager();
      h.resolveFn.mockReturnValue({
        execute: vi.fn().mockRejectedValue(new Error("boom")),
      });

      await expect(
        manager.createFirebaseCustomToken({ uid: "uid" } as any),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@saml/ERROR_CREATING_FIREBASE_CUSTOM_TOKEN",
        }),
      );
    });
  });

  describe("getFrontendRedirectUrl", () => {
    it("should use the configured frontend url", async () => {
      const manager = await createManager();
      process.env.FRONTEND_URL = "http://frontend";

      await expect(manager.getFrontendRedirectUrl()).resolves.toBe(
        "http://frontend/auth/callback",
      );
    });

    it("should fall back to localhost when no frontend url is configured", async () => {
      const manager = await createManager();
      delete (process.env as Partial<NodeJS.ProcessEnv>).FRONTEND_URL;

      await expect(manager.getFrontendRedirectUrl()).resolves.toBe(
        "http://localhost:3000/auth/callback",
      );
    });
  });

  describe("storeCustomTokenInSession", () => {
    it("should persist the custom token and metadata in the session", async () => {
      const manager = await createManager();
      h.resolveFn.mockReturnValue({
        execute: vi.fn().mockResolvedValue({ customToken: "custom-token" }),
      });
      const req: any = { session: {} };

      await manager.storeCustomTokenInSession(req, { uid: "uid-1" } as any);

      expect(req.session.customToken).toBe("custom-token");
      expect(req.session.userId).toBe("uid-1");
      expect(req.session.tokenExpiresAt).toBeTypeOf("number");
    });
  });

  describe("getCustomTokenFromSession", () => {
    it("should return null when there is no token in the session", async () => {
      const manager = await createManager();

      expect(
        manager.getCustomTokenFromSession({ session: {} } as any),
      ).toBeNull();
    });

    it("should return null when the token is expired", async () => {
      const manager = await createManager();
      const req: any = {
        session: { customToken: "token", tokenExpiresAt: 0, userId: "uid-1" },
      };

      expect(manager.getCustomTokenFromSession(req)).toBeNull();
    });

    it("should return null and register a mismatch when the user id does not match", async () => {
      const manager = await createManager();
      const req: any = {
        session: {
          customToken: "token",
          tokenExpiresAt: Date.now(),
          userId: "uid-1",
        },
      };

      expect(manager.getCustomTokenFromSession(req, "uid-2")).toBeNull();
    });

    it("should return and clear the token when it is valid and the user id matches", async () => {
      const manager = await createManager();
      const req: any = {
        session: {
          customToken: "token",
          tokenExpiresAt: Date.now(),
          userId: "uid-1",
        },
      };

      const token = manager.getCustomTokenFromSession(req, "uid-1");

      expect(token).toBe("token");
      expect(req.session.customToken).toBeNull();
    });

    it("should return the token when it is valid and no user id is expected", async () => {
      const manager = await createManager();
      const req: any = {
        session: {
          customToken: "token",
          tokenExpiresAt: Date.now(),
          userId: "uid-1",
        },
      };

      expect(manager.getCustomTokenFromSession(req)).toBe("token");
    });
  });
});

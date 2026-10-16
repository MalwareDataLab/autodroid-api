import { RateLimiterRedis } from "rate-limiter-flexible";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { ssrfSafeJsonFetch } from "@shared/utils/ssrfSafeJsonFetch";

// Constant import
import {
  MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS,
  MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_DURATION_SECONDS,
  MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_KEY_PREFIX,
  MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_POINTS,
} from "../constants/mcpAuthorization.constant";

// Target import
import { McpAuthorizationClientMetadataFetchService } from "./mcpAuthorizationClientMetadataFetch.service";

vi.mock("@shared/utils/ssrfSafeJsonFetch", () => ({
  ssrfSafeJsonFetch: vi.fn(),
}));

const rateLimiterConsumeMock = vi.fn();
vi.mock("rate-limiter-flexible", async importOriginal => {
  const actual = await importOriginal<typeof import("rate-limiter-flexible")>();
  return {
    ...actual,
    RateLimiterRedis: vi.fn(() => ({ consume: rateLimiterConsumeMock })),
  };
});

const ssrfSafeJsonFetchMock = vi.mocked(ssrfSafeJsonFetch);

const CLIENT_ID = "https://client.example.com/.well-known/mcp-client.json";

const validDocument = (overrides: Record<string, unknown> = {}) => ({
  client_id: CLIENT_ID,
  redirect_uris: ["https://client.example.com/callback"],
  client_name: "Example MCP Client",
  ...overrides,
});

describe("Service: McpAuthorizationClientMetadataFetchService", () => {
  let getMock: ReturnType<typeof vi.fn>;
  let setMock: ReturnType<typeof vi.fn>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;

  let service: McpAuthorizationClientMetadataFetchService;

  beforeEach(() => {
    vi.clearAllMocks();

    rateLimiterConsumeMock.mockReset();
    rateLimiterConsumeMock.mockResolvedValue(undefined);

    getMock = vi.fn().mockResolvedValue(null);
    setMock = vi.fn().mockResolvedValue("OK");

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { get: getMock, set: setMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    service = new McpAuthorizationClientMetadataFetchService(
      inMemoryDatabaseProviderMock,
    );

    ssrfSafeJsonFetchMock.mockResolvedValue({
      body: validDocument(),
      headers: {},
    });
  });

  describe("client_id shape validation", () => {
    it("should reject a malformed client_id", async () => {
      await expect(
        service.execute({ client_id: "not a url" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@mcp_authorization_client_metadata_fetch_service/INVALID_CLIENT_ID",
          statusCode: 400,
          message: "client_id must be a valid URL.",
        }),
      );
      expect(ssrfSafeJsonFetchMock).not.toHaveBeenCalled();
    });

    it("should reject a non-https client_id", async () => {
      await expect(
        service.execute({ client_id: "http://client.example.com/doc.json" }),
      ).rejects.toThrowError("client_id must use the https scheme.");
    });

    it("should reject a plain http loopback client_id without fetching it", async () => {
      await expect(
        service.execute({ client_id: "http://127.0.0.1:3118/client.json" }),
      ).rejects.toThrowError("client_id must use the https scheme.");
      expect(ssrfSafeJsonFetchMock).not.toHaveBeenCalled();
    });

    it("should reject a client_id with no path", async () => {
      await expect(
        service.execute({ client_id: "https://client.example.com" }),
      ).rejects.toThrowError("client_id must include a path.");
    });

    it.each([
      "https://client.example.com/a/../doc.json",
      "https://client.example.com/a/./doc.json",
      "https://client.example.com/a/%2e%2e/doc.json",
      "https://client.example.com/a/%2E/doc.json",
      "https://client.example.com/doc/..",
    ])(
      "should reject %s because the client_id must not contain dot path segments",
      async client_id => {
        await expect(service.execute({ client_id })).rejects.toThrowError(
          "client_id must not contain dot path segments.",
        );
        expect(ssrfSafeJsonFetchMock).not.toHaveBeenCalled();
      },
    );

    it("should reject a client_id carrying a backslash, which URL parsing treats as a slash and could hide a dot segment", async () => {
      await expect(
        service.execute({ client_id: "https://client.example.com/a\\..\\b/c" }),
      ).rejects.toThrowError("client_id must not contain backslashes.");
      expect(ssrfSafeJsonFetchMock).not.toHaveBeenCalled();
    });

    it.each([
      ["a tab", "https://client.example.com/a/.\t./client.json"],
      ["a newline", "https://client.example.com/a/.\n./client.json"],
      [
        "a carriage return",
        "https://client.example.com/a/%2e\r%2e/client.json",
      ],
      ["a space", "https://client.example.com/a b/client.json"],
      ["a null byte", "https://client.example.com/a\u0000/client.json"],
    ])(
      "should reject a client_id containing %s, which URL parsing strips or alters and could hide a dot segment",
      async (_label, client_id) => {
        await expect(service.execute({ client_id })).rejects.toThrowError(
          "client_id must not contain whitespace or control characters.",
        );
        expect(ssrfSafeJsonFetchMock).not.toHaveBeenCalled();
      },
    );

    it("should reject a client_id carrying a fragment", async () => {
      await expect(
        service.execute({
          client_id: "https://client.example.com/doc.json#frag",
        }),
      ).rejects.toThrowError("client_id must not include a fragment.");
    });
  });

  describe("caching", () => {
    it("should return the cached document without fetching on a cache hit", async () => {
      getMock.mockResolvedValueOnce(JSON.stringify(validDocument()));

      const result = await service.execute({ client_id: CLIENT_ID });

      expect(result).toEqual(validDocument());
      expect(ssrfSafeJsonFetchMock).not.toHaveBeenCalled();
    });

    it("should cache a fresh fetch with the default TTL when there is no Cache-Control header", async () => {
      await service.execute({ client_id: CLIENT_ID });

      expect(setMock).toHaveBeenCalledTimes(1);
      const [cacheKey, cachedValue, expFlag, ttlSeconds] =
        setMock.mock.calls[0];
      expect(cacheKey).toMatch(/^mcp-oauth:cimd:/);
      expect(JSON.parse(cachedValue)).toEqual(validDocument());
      expect(expFlag).toBe("EX");
      expect(ttlSeconds).toBe(300);
    });

    it.each(["no-store", "no-cache", "private, no-store, max-age=600"])(
      "should still cache a document served with Cache-Control: %s for the minimum TTL",
      async cacheControl => {
        ssrfSafeJsonFetchMock.mockResolvedValue({
          body: validDocument(),
          headers: { "cache-control": cacheControl },
        });

        const result = await service.execute({ client_id: CLIENT_ID });

        expect(result).toEqual(validDocument());
        expect(setMock).toHaveBeenCalledExactlyOnceWith(
          expect.stringMatching(/^mcp-oauth:cimd:/),
          expect.any(String),
          "EX",
          MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS,
        );
        expect(JSON.parse(setMock.mock.calls[0][1])).toEqual(validDocument());
      },
    );

    it.each([
      [5, MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS],
      [
        MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS - 1,
        MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS,
      ],
      [
        MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS,
        MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS,
      ],
      [
        MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS + 1,
        MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS + 1,
      ],
    ])(
      "should cache a document served with Cache-Control: max-age=%i for %i seconds",
      async (maxAge, expectedTtlSeconds) => {
        ssrfSafeJsonFetchMock.mockResolvedValue({
          body: validDocument(),
          headers: { "cache-control": `max-age=${maxAge}` },
        });

        await service.execute({ client_id: CLIENT_ID });

        expect(setMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          "EX",
          expectedTtlSeconds,
        );
      },
    );

    it("should clamp a Cache-Control max-age above the maximum down to the maximum", async () => {
      ssrfSafeJsonFetchMock.mockResolvedValue({
        body: validDocument(),
        headers: { "cache-control": "max-age=999999" },
      });

      await service.execute({ client_id: CLIENT_ID });

      expect(setMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "EX",
        3600,
      );
    });

    it("should use a Cache-Control max-age within range as-is", async () => {
      ssrfSafeJsonFetchMock.mockResolvedValue({
        body: validDocument(),
        headers: { "cache-control": "max-age=600" },
      });

      await service.execute({ client_id: CLIENT_ID });

      expect(setMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "EX",
        600,
      );
    });
  });

  describe("rate limiting", () => {
    const rateLimitExceeded = async () =>
      new (
        await vi.importActual<typeof import("rate-limiter-flexible")>(
          "rate-limiter-flexible",
        )
      ).RateLimiterRes(0, 60000);

    it("should consume the rate limit, keyed by hostname, before the outbound fetch", async () => {
      const callOrder: string[] = [];
      rateLimiterConsumeMock.mockImplementationOnce(async () => {
        callOrder.push("consume");
      });
      ssrfSafeJsonFetchMock.mockImplementationOnce(async () => {
        callOrder.push("fetch");
        return { body: validDocument(), headers: {} };
      });

      await expect(service.execute({ client_id: CLIENT_ID })).resolves.toEqual(
        validDocument(),
      );

      expect(rateLimiterConsumeMock).toHaveBeenCalledTimes(1);
      expect(rateLimiterConsumeMock).toHaveBeenCalledWith("client.example.com");
      expect(callOrder).toEqual(["consume", "fetch"]);
    });

    it("should refuse a fetch once the per-host budget is exhausted, before any outbound request", async () => {
      const { RateLimiterMemory } = await vi.importActual<
        typeof import("rate-limiter-flexible")
      >("rate-limiter-flexible");
      const memoryLimiter = new RateLimiterMemory({
        points: MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_POINTS,
        duration: MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_DURATION_SECONDS,
      });
      rateLimiterConsumeMock.mockImplementation((key: string) =>
        memoryLimiter.consume(key),
      );
      ssrfSafeJsonFetchMock.mockImplementation(async url => ({
        body: validDocument({ client_id: url }),
        headers: { "cache-control": "no-store" },
      }));
      const clientIdForPath = (index: number) =>
        `https://client.example.com/clients/${index}.json`;

      const clientIdsWithinBudget = Array.from(
        { length: MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_POINTS },
        (_, index) => clientIdForPath(index),
      );
      await expect(
        Promise.all(
          clientIdsWithinBudget.map(client_id =>
            service.execute({ client_id }),
          ),
        ),
      ).resolves.toEqual(
        clientIdsWithinBudget.map(client_id => validDocument({ client_id })),
      );

      await expect(
        service.execute({ client_id: CLIENT_ID }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@mcp_authorization_client_metadata_fetch_service/INVALID_CLIENT_ID",
          statusCode: 400,
          message:
            "This host has exceeded the rate limit for client metadata fetches.",
        }),
      );
      expect(ssrfSafeJsonFetchMock).toHaveBeenCalledTimes(
        MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_POINTS,
      );
      expect(ssrfSafeJsonFetchMock).not.toHaveBeenCalledWith(
        CLIENT_ID,
        expect.anything(),
      );
      expect(RateLimiterRedis).toHaveBeenCalledWith({
        storeClient: inMemoryDatabaseProviderMock.connection,
        points: MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_POINTS,
        duration: MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_DURATION_SECONDS,
        keyPrefix: MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_KEY_PREFIX,
      });

      const otherHostClientId = "https://other.example.com/client.json";
      await expect(
        service.execute({ client_id: otherHostClientId }),
      ).resolves.toMatchObject({ client_id: otherHostClientId });
    });

    it("should rethrow the original fetch failure when the budget still allows the fetch", async () => {
      ssrfSafeJsonFetchMock.mockRejectedValueOnce(
        new Error("Unexpected HTTP status 404."),
      );

      await expect(
        service.execute({ client_id: CLIENT_ID }),
      ).rejects.toThrowError("Unexpected HTTP status 404.");

      expect(rateLimiterConsumeMock).toHaveBeenCalledTimes(1);
      expect(rateLimiterConsumeMock).toHaveBeenCalledWith("client.example.com");
    });

    it("should propagate a genuine infra failure from the limiter without fetching", async () => {
      const connectionError = new Error("Connection is closed.");
      rateLimiterConsumeMock.mockRejectedValueOnce(connectionError);

      await expect(
        service.execute({ client_id: CLIENT_ID }),
      ).rejects.toThrowError(connectionError);
      expect(ssrfSafeJsonFetchMock).not.toHaveBeenCalled();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const useFakeClockCacheAndLimiter = async () => {
      vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
      const store = new Map<string, { value: string; expiresAt: number }>();
      getMock.mockImplementation(async (key: string) => {
        const entry = store.get(key);
        return entry && entry.expiresAt > Date.now() ? entry.value : null;
      });
      setMock.mockImplementation(
        async (key: string, value: string, _flag: string, ttl: number) => {
          store.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
          return "OK";
        },
      );
      const { RateLimiterMemory } = await vi.importActual<
        typeof import("rate-limiter-flexible")
      >("rate-limiter-flexible");
      const memoryLimiter = new RateLimiterMemory({
        points: MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_POINTS,
        duration: MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_DURATION_SECONDS,
      });
      rateLimiterConsumeMock.mockImplementation((key: string) =>
        memoryLimiter.consume(key),
      );
    };

    it.each(["no-store", "no-cache", "max-age=5"])(
      "should keep serving a client whose document is served with Cache-Control: %s under steady traffic, fetching it at most once per minimum TTL",
      async cacheControl => {
        await useFakeClockCacheAndLimiter();
        ssrfSafeJsonFetchMock.mockResolvedValue({
          body: validDocument(),
          headers: { "cache-control": cacheControl },
        });
        const requestIntervalSeconds = 10;
        const requestCount =
          (2 * MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_DURATION_SECONDS) /
          requestIntervalSeconds;

        const results = await Array.from({ length: requestCount }).reduce<
          Promise<unknown[]>
        >(async previous => {
          const collected = await previous;
          const result = await service.execute({ client_id: CLIENT_ID });
          await vi.advanceTimersByTimeAsync(requestIntervalSeconds * 1000);
          return [...collected, result];
        }, Promise.resolve([]));

        expect(results).toEqual(
          Array.from({ length: requestCount }, () => validDocument()),
        );
        expect(ssrfSafeJsonFetchMock).toHaveBeenCalledTimes(
          (2 * MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_DURATION_SECONDS) /
            MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS,
        );
      },
    );

    it("should still exhaust the per-host budget with distinct uncached URLs, while a URL already cached keeps being served", async () => {
      await useFakeClockCacheAndLimiter();
      ssrfSafeJsonFetchMock.mockImplementation(async url => ({
        body: validDocument({ client_id: url }),
        headers: { "cache-control": "no-store" },
      }));
      await service.execute({ client_id: CLIENT_ID });
      const distinctClientIds = Array.from(
        { length: MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_POINTS - 1 },
        (_, index) => `https://client.example.com/clients/${index}.json`,
      );
      await distinctClientIds.reduce<Promise<unknown>>(
        async (previous, client_id) => {
          await previous;
          return service.execute({ client_id });
        },
        Promise.resolve(),
      );

      await expect(
        service.execute({
          client_id: "https://client.example.com/clients/one-too-many.json",
        }),
      ).rejects.toThrowError(
        "This host has exceeded the rate limit for client metadata fetches.",
      );
      await expect(service.execute({ client_id: CLIENT_ID })).resolves.toEqual(
        validDocument(),
      );
      expect(ssrfSafeJsonFetchMock).toHaveBeenCalledTimes(
        MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_POINTS,
      );
    });

    it("should serve a cache hit without consuming the rate limit, even with the budget exhausted", async () => {
      rateLimiterConsumeMock.mockRejectedValue(await rateLimitExceeded());
      getMock.mockResolvedValueOnce(JSON.stringify(validDocument()));

      await expect(service.execute({ client_id: CLIENT_ID })).resolves.toEqual(
        validDocument(),
      );

      expect(rateLimiterConsumeMock).not.toHaveBeenCalled();
      expect(ssrfSafeJsonFetchMock).not.toHaveBeenCalled();
    });
  });

  describe("document validation", () => {
    it("should reject a document that does not match the expected shape", async () => {
      ssrfSafeJsonFetchMock.mockResolvedValue({
        body: { not: "a client metadata document" },
        headers: {},
      });

      await expect(
        service.execute({ client_id: CLIENT_ID }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@mcp_authorization_client_metadata_fetch_service/INVALID_METADATA_DOCUMENT",
          statusCode: 502,
        }),
      );
    });

    it("should reject a document whose client_id does not match the requested URL", async () => {
      ssrfSafeJsonFetchMock.mockResolvedValue({
        body: validDocument({
          client_id: "https://other.example.com/doc.json",
        }),
        headers: {},
      });

      await expect(
        service.execute({ client_id: CLIENT_ID }),
      ).rejects.toThrowError(
        "The document's client_id does not match the requested URL.",
      );
    });

    it("should reject a document declaring a client_secret", async () => {
      ssrfSafeJsonFetchMock.mockResolvedValue({
        body: validDocument({ client_secret: "shh" }),
        headers: {},
      });

      await expect(
        service.execute({ client_id: CLIENT_ID }),
      ).rejects.toThrowError(
        "A Client ID Metadata Document must describe a public client (no client_secret).",
      );
    });

    it("should reject a document declaring a non-none token_endpoint_auth_method", async () => {
      ssrfSafeJsonFetchMock.mockResolvedValue({
        body: validDocument({
          token_endpoint_auth_method: "client_secret_post",
        }),
        headers: {},
      });

      await expect(
        service.execute({ client_id: CLIENT_ID }),
      ).rejects.toThrowError(
        'A Client ID Metadata Document must declare token_endpoint_auth_method "none".',
      );
    });

    it("should accept a document that omits token_endpoint_auth_method", async () => {
      ssrfSafeJsonFetchMock.mockResolvedValue({
        body: validDocument(),
        headers: {},
      });

      await expect(service.execute({ client_id: CLIENT_ID })).resolves.toEqual(
        validDocument(),
      );
    });

    it("should reject a document with no redirect_uris", async () => {
      ssrfSafeJsonFetchMock.mockResolvedValue({
        body: validDocument({ redirect_uris: [] }),
        headers: {},
      });

      await expect(
        service.execute({ client_id: CLIENT_ID }),
      ).rejects.toThrowError(
        "The document must declare at least one redirect_uri.",
      );
    });

    it.each([
      ["https://client.example.com/callback", true],
      ["ftp://client.example.com/callback", false],
      ["http://127.0.0.1:3118/callback", true],
      ["http://[::1]:3118/callback", true],
      ["http://attacker.example.com/callback", false],
    ])(
      "should validate redirect_uri %s as allowed=%s",
      async (redirectUri, allowed) => {
        ssrfSafeJsonFetchMock.mockResolvedValue({
          body: validDocument({ redirect_uris: [redirectUri] }),
          headers: {},
        });

        const promise = service.execute({ client_id: CLIENT_ID });

        if (allowed) {
          await expect(promise).resolves.toBeDefined();
        } else {
          await expect(promise).rejects.toThrowError(
            `redirect_uri "${redirectUri}" must use https, or http on a loopback address.`,
          );
        }
      },
    );
  });
});

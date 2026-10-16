import { OAuthClientInformationFullSchema } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { hashBase64Url } from "@shared/utils/hashBase64Url";
import { ssrfSafeJsonFetch } from "@shared/utils/ssrfSafeJsonFetch";
import { isMcpAuthorizationRedirectUriAllowed } from "../utils/isMcpAuthorizationRedirectUriAllowed.util";

// Constant import
import {
  MCP_AUTHORIZATION_CIMD_CACHE_DEFAULT_TTL_SECONDS,
  MCP_AUTHORIZATION_CIMD_CACHE_KEY_PREFIX,
  MCP_AUTHORIZATION_CIMD_CACHE_MAX_TTL_SECONDS,
  MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS,
  MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_DURATION_SECONDS,
  MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_KEY_PREFIX,
  MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_POINTS,
  MCP_AUTHORIZATION_CIMD_FETCH_TIMEOUT_MS,
  MCP_AUTHORIZATION_CIMD_MAX_RESPONSE_BYTES,
} from "../constants/mcpAuthorization.constant";

interface IRequest {
  client_id: string;
}

const CACHE_CONTROL_MAX_AGE_PATTERN = /max-age=(\d+)/i;
const CACHE_CONTROL_NO_CACHE_PATTERN = /(^|[\s,])no-(store|cache)([\s,=]|$)/i;

const ERROR_KEY_PREFIX = "@mcp_authorization_client_metadata_fetch_service";

@injectable()
class McpAuthorizationClientMetadataFetchService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,
  ) {}

  public async execute({
    client_id,
  }: IRequest): Promise<OAuthClientInformationFull> {
    this.validateClientIdShape(client_id);

    const cacheKey = this.getCacheKey(client_id);

    const cached = await this.inMemoryDatabaseProvider.connection.get(cacheKey);
    if (cached) return JSON.parse(cached);

    await this.consumeFetchRateLimit(client_id);

    const { body, headers } = await ssrfSafeJsonFetch(client_id, {
      timeoutMs: MCP_AUTHORIZATION_CIMD_FETCH_TIMEOUT_MS,
      maxResponseBytes: MCP_AUTHORIZATION_CIMD_MAX_RESPONSE_BYTES,
    });

    const document = this.parseAndValidateDocument(body, client_id);

    await this.inMemoryDatabaseProvider.connection.set(
      cacheKey,
      JSON.stringify(document),
      "EX",
      this.resolveCacheTtlSeconds(headers["cache-control"]),
    );

    return document;
  }

  private async consumeFetchRateLimit(client_id: string): Promise<void> {
    const { hostname } = new URL(client_id);

    const limiter = new RateLimiterRedis({
      storeClient: this.inMemoryDatabaseProvider.connection,
      points: MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_POINTS,
      duration: MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_DURATION_SECONDS,
      keyPrefix: MCP_AUTHORIZATION_CIMD_FETCH_RATE_LIMIT_KEY_PREFIX,
    });

    try {
      await limiter.consume(hostname);
    } catch (result) {
      if (!(result instanceof RateLimiterRes)) throw result;
      throw this.invalidClientId(
        "This host has exceeded the rate limit for client metadata fetches.",
      );
    }
  }

  private getCacheKey(client_id: string): string {
    return `${MCP_AUTHORIZATION_CIMD_CACHE_KEY_PREFIX}${hashBase64Url(client_id)}`;
  }

  private invalidClientId(message: string): AppError {
    return new AppError({
      key: `${ERROR_KEY_PREFIX}/INVALID_CLIENT_ID`,
      message,
      statusCode: 400,
    });
  }

  private invalidDocument(message: string): AppError {
    return new AppError({
      key: `${ERROR_KEY_PREFIX}/INVALID_METADATA_DOCUMENT`,
      message,
      statusCode: 502,
    });
  }

  private validateClientIdShape(client_id: string): void {
    let parsed: URL;
    try {
      parsed = new URL(client_id);
    } catch {
      throw this.invalidClientId("client_id must be a valid URL.");
    }

    if (parsed.protocol !== "https:")
      throw this.invalidClientId("client_id must use the https scheme.");

    // eslint-disable-next-line no-control-regex -- matching control characters is the point
    if (/[\u0000-\u0020\u007f]/.test(client_id))
      throw this.invalidClientId(
        "client_id must not contain whitespace or control characters.",
      );

    if (client_id.includes("\\"))
      throw this.invalidClientId("client_id must not contain backslashes.");

    const rawPath = client_id
      .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, "")
      .split(/[?#]/)[0];
    if (rawPath.split("/").some(segment => /^(\.|%2e){1,2}$/i.test(segment)))
      throw this.invalidClientId(
        "client_id must not contain dot path segments.",
      );

    if (parsed.pathname === "/")
      throw this.invalidClientId("client_id must include a path.");

    if (parsed.hash)
      throw this.invalidClientId("client_id must not include a fragment.");
  }

  private parseAndValidateDocument(
    body: unknown,
    client_id: string,
  ): OAuthClientInformationFull {
    const result = OAuthClientInformationFullSchema.safeParse(body);

    if (!result.success)
      throw this.invalidDocument(
        "The client metadata document does not match the expected shape.",
      );

    const document = result.data;

    if (document.client_id !== client_id)
      throw this.invalidDocument(
        "The document's client_id does not match the requested URL.",
      );

    if (document.client_secret)
      throw this.invalidDocument(
        "A Client ID Metadata Document must describe a public client (no client_secret).",
      );

    if (
      document.token_endpoint_auth_method &&
      document.token_endpoint_auth_method !== "none"
    )
      throw this.invalidDocument(
        'A Client ID Metadata Document must declare token_endpoint_auth_method "none".',
      );

    if (!document.redirect_uris.length)
      throw this.invalidDocument(
        "The document must declare at least one redirect_uri.",
      );

    document.redirect_uris.forEach(redirectUri =>
      this.validateRedirectUri(redirectUri),
    );

    return document;
  }

  private validateRedirectUri(redirectUri: string): void {
    if (!isMcpAuthorizationRedirectUriAllowed(redirectUri))
      throw this.invalidDocument(
        `redirect_uri "${redirectUri}" must use https, or http on a loopback address.`,
      );
  }

  private resolveCacheTtlSeconds(
    cacheControlHeader: string | undefined,
  ): number {
    if (
      cacheControlHeader &&
      CACHE_CONTROL_NO_CACHE_PATTERN.test(cacheControlHeader)
    )
      return MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS;

    const match = cacheControlHeader?.match(CACHE_CONTROL_MAX_AGE_PATTERN);
    if (!match) return MCP_AUTHORIZATION_CIMD_CACHE_DEFAULT_TTL_SECONDS;

    return Math.min(
      Math.max(Number(match[1]), MCP_AUTHORIZATION_CIMD_CACHE_MIN_TTL_SECONDS),
      MCP_AUTHORIZATION_CIMD_CACHE_MAX_TTL_SECONDS,
    );
  }
}

export { McpAuthorizationClientMetadataFetchService };

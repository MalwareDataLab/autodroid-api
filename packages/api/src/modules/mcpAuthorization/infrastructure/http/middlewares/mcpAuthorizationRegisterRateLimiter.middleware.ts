import { TooManyRequestsError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { RequestHandler } from "express";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { container } from "tsyringe";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Constant import
import {
  MCP_AUTHORIZATION_REGISTER_RATE_LIMIT_DURATION_SECONDS,
  MCP_AUTHORIZATION_REGISTER_RATE_LIMIT_KEY_PREFIX,
  MCP_AUTHORIZATION_REGISTER_RATE_LIMIT_POINTS,
} from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";

const buildLimiter = (): RateLimiterRedis => {
  const inMemoryDatabaseProvider = container.resolve<IInMemoryDatabaseProvider>(
    "InMemoryDatabaseProvider",
  );
  return new RateLimiterRedis({
    storeClient: inMemoryDatabaseProvider.connection,
    points: MCP_AUTHORIZATION_REGISTER_RATE_LIMIT_POINTS,
    duration: MCP_AUTHORIZATION_REGISTER_RATE_LIMIT_DURATION_SECONDS,
    keyPrefix: MCP_AUTHORIZATION_REGISTER_RATE_LIMIT_KEY_PREFIX,
  });
};

const mcpAuthorizationRegisterRateLimiterMiddleware: RequestHandler = async (
  req,
  res,
  next,
) => {
  if (!req.ip) return next();

  try {
    await buildLimiter().consume(req.ip);
    return next();
  } catch (result) {
    if (!(result instanceof RateLimiterRes)) throw result;

    return res
      .status(429)
      .json(
        new TooManyRequestsError(
          "You have exceeded the rate limit for client registration requests.",
        ).toResponseObject(),
      );
  }
};

export { mcpAuthorizationRegisterRateLimiterMiddleware };

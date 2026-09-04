import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/node";
import util from "node:util";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { logger } from "@shared/utils/logger";

interface IAppError {
  key: string;
  message: string;
  statusCode?: number;
  debug?: {
    [key: string]: any;
    disableRegister?: boolean;
  };
  payload?: {
    [key: string]: any;
    errors?: Array<any>;
  };
}

class AppError extends Error {
  public readonly handler = "AppError";

  public readonly name: string;
  public readonly message: string;

  public readonly key: string;

  public readonly errorCode: string;
  public readonly statusCode: number;

  public readonly debug:
    | {
        [key: string]: any;
      }
    | undefined;

  public readonly payload:
    | {
        [key: string]: any;
        errors?: Array<any>;
      }
    | undefined;

  public readonly action: Promise<void>;

  constructor(params?: IAppError) {
    super(params?.message);
    Object.setPrototypeOf(this, AppError.prototype);

    if (Error.captureStackTrace) Error.captureStackTrace(this, AppError);

    if (params) {
      this.name = params.key;
      this.message = params.message;

      this.key = params.key;

      this.errorCode = randomUUID();
      this.statusCode = params.statusCode
        ? params.statusCode
        : params.debug
          ? 500
          : 400;

      this.debug = params.debug
        ? {
            ...(params.debug || {}),
            error_code: this.errorCode,
          }
        : undefined;

      this.payload = params.payload;
    }

    this.action = this.register();
  }

  private async register() {
    const envConfig = getEnvConfig();

    if (
      (!!this.debug || this.statusCode >= 500) &&
      !this.debug?.disableRegister &&
      !envConfig.isTestEnv
    ) {
      Sentry.addBreadcrumb({
        category: "data",
        message: this.message,
        data: this.debug,
        type: "error",
        level: "debug",
      });
      Sentry.captureException(this);

      if (envConfig.DEBUG === "true")
        logger.error(`❌ Error debug: ${util.inspect(this, false, 4, true)}`);
    }
  }

  static make(params: IAppError) {
    return new AppError(params);
  }

  static isInstance(error: unknown): error is AppError {
    if (!error) return false;
    return (
      error instanceof AppError ||
      (error as any).handler === AppError.prototype.name ||
      (error as any).handler === "AppError"
    );
  }
}

export { AppError };

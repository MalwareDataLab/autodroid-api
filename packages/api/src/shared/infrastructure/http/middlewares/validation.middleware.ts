import { NextFunction, Request, Response } from "express";
import { validateOrReject, ValidationError } from "class-validator";
import { ClassConstructor, plainToInstance } from "class-transformer";

// i18n import
import { TFunction } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

const Segments = {
  BODY: "body",
  COOKIES: "cookies",
  HEADERS: "headers",
  PARAMS: "params",
  QUERY: "query",
  SIGNEDCOOKIES: "signedCookies",
} as const;

type ClassType<T> = new (...args: any[]) => T;

async function validateSchema<T extends object>(params: {
  value: any;
  t: TFunction;
  schema: ClassType<T>;
}) {
  const { t, schema: Schema, value } = params;

  try {
    const dto = plainToInstance(Schema, value, {
      ignoreDecorators: true,
    });
    await validateOrReject(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  } catch (err) {
    if (
      err instanceof ValidationError ||
      (Array.isArray(err) && err.some(e => e instanceof ValidationError))
    ) {
      const selectedError = Array.isArray(err)
        ? err.find(e => e instanceof ValidationError)
        : err;

      const message = selectedError?.constraints
        ? (Object.values(selectedError.constraints)[0] as string)
        : null;

      throw new AppError({
        key: "@general/VALIDATION_FAIL",
        message: message || t("@general/VALIDATION_FAIL", "Validation error."),
        statusCode: 400,
        payload: {
          errors: Array.isArray(err) ? err : [err],
        },
      });
    }
    throw new AppError({
      key: "@general/VALIDATION_FATAL_FAILURE",
      message: t(
        "@general/VALIDATION_FATAL_FAILURE",
        "Validation fatal server failure.",
      ),
      statusCode: 500,
    });
  }
}

function validationMiddleware<T extends object>(params: {
  schema: ClassConstructor<T>;
  segment: keyof typeof Segments;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await validateSchema({
        value: req[Segments[params.segment]],
        t: req.t,
        schema: params.schema,
      });
      return next();
    } catch (error) {
      if (
        AppError.isInstance(error) &&
        error.key === "@general/VALIDATION_FAIL" &&
        error.payload?.errors
      ) {
        return res.status(error.statusCode || 400).json({
          key: error.key,
          message: error.message,
          errors: error.payload.errors,
        });
      }
      throw error;
    }
  };
}

const validateRequest = validationMiddleware;

export { Segments, validateSchema, validateRequest };

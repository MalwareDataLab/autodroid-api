import { Request, Response, NextFunction } from "express";

// Error import
import { AppError } from "@shared/errors/AppError";

// Middleware import
import {
  Segments,
  validateSchema,
} from "@shared/infrastructure/http/middlewares/validation.middleware";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Type import
import { Cursor } from "@modules/pagination/types/IPagination.type";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";

// Scalar import
import {
  isCursor,
  parseCursor,
} from "@modules/pagination/types/paginationConnectionCursor.scalar";

const toCursor = (value: unknown, t: Request["t"]): Cursor | undefined => {
  if (value === undefined || value === null) return undefined;

  try {
    const cursor = typeof value === "string" ? parseCursor(value) : value;
    if (!isCursor(cursor)) throw new Error("Cursor is not valid.");
    return cursor;
  } catch {
    throw new AppError({
      key: "@general/VALIDATION_FAIL",
      message: t("@pagination/INVALID_CURSOR", "Cursor is not valid."),
      statusCode: 400,
    });
  }
};

function paginationMiddleware(params: { segment: keyof typeof Segments }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const source = req[Segments[params.segment]] || {};

    const value = parse(PaginationSchema, {
      skip: source.skip,
      take: source.take,

      before: toCursor(source.before, req.t),
      last: source.last,

      after: toCursor(source.after, req.t),
      first: source.first,
    } satisfies PaginationSchema);

    await validateSchema({
      value,
      t: req.t,
      schema: PaginationSchema,
    });

    req.pagination = value;

    next();
  };
}

export { paginationMiddleware };

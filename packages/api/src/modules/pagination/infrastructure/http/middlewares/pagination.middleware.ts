import { Request, Response, NextFunction } from "express";

// Middleware import
import {
  Segments,
  validateSchema,
} from "@shared/infrastructure/http/middlewares/validation.middleware";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";

function paginationMiddleware(params: { segment: keyof typeof Segments }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const source = req[Segments[params.segment]] || {};

    const value = parse(PaginationSchema, {
      skip: source.skip,
      take: source.take,

      before: source.before,
      last: source.last,

      after: source.after,
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

import { Transform, Type } from "class-transformer";
import { Request, Response, NextFunction } from "express";
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  ValidateNested,
} from "class-validator";

// Middleware import
import {
  Segments,
  validateSchema,
} from "@shared/infrastructure/http/middlewares/validation.middleware";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Schema import
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

class SortingSchema<T extends readonly string[]> {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(5)
  @Type(() => SortingFieldSchema)
  @Transform(({ value }) =>
    typeof value === "string"
      ? parse(SortingFieldSchema, JSON.parse(value))
      : value,
  )
  sort: SortingFieldSchema<T>[];
}

function sortingMiddleware<T extends readonly string[]>(params: {
  segment: keyof typeof Segments;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const source = req[Segments[params.segment]] || {};

    const value = parse(SortingSchema, {
      sort: source.sort,
    } satisfies SortingSchema<T>);

    await validateSchema({
      value,
      t: req.t,
      schema: SortingSchema,
    });

    req.sorting = value.sort;

    next();
  };
}

export { sortingMiddleware };

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
import { validateSorting } from "@modules/sorting/utils/validateSorting.util";

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

function sortingMiddleware<T>(params: {
  segment: keyof typeof Segments;
  allowed: ReadonlyArray<keyof T>;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const source = req[Segments[params.segment]] || {};

    const value = parse(SortingSchema, {
      sort: source.sort,
    } as SortingSchema<Array<string>>);

    await validateSchema({
      value,
      t: req.t,
      schema: SortingSchema,
    });

    try {
      validateSorting<T>({
        value: value.sort,
        allowed: params.allowed,
        nullable: { nullable: true },
      });
    } catch {
      return res.status(400).json({
        message: req.t("Invalid sorting."),
      });
    }

    req.sorting = value.sort;

    return next();
  };
}

export { sortingMiddleware };

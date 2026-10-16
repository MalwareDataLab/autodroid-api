// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { makeCursorObjFromEntity } from "../makeCursorObjFromEntity";

// Constant import
import { TAKE_DEFAULT } from "@modules/pagination/constants/paginationLimit.constant";

// DTO import
import {
  IProcessedPaginationDTO,
  IPaginationDTO,
} from "@modules/pagination/types/IPagination.dto";

// Scalar import
import { isCursor } from "@modules/pagination/types/paginationConnectionCursor.scalar";

const invalidPagination = (message: string) =>
  new AppError({
    key: "@pagination/INVALID_PAGINATION",
    message,
    statusCode: 400,
  });

const makePaginationObj = (
  paginationSchema?: IPaginationDTO,
): IProcessedPaginationDTO => {
  if (!paginationSchema)
    return {
      cursor: undefined,
      skip: 0,
      take: undefined,
    };

  const defaultPagination = {
    cursor: undefined,
    skip: 0,
    take: TAKE_DEFAULT,
  };

  const {
    /** Before cursor pagination */
    before,
    last,

    /** After cursor pagination */
    after,
    first,

    /** Skip and take pagination */
    skip,
    take,
  } = paginationSchema;

  if (!before && !after && !skip && !take) return defaultPagination;

  if (
    (!!before || !!last || typeof last === "number") &&
    (!!after || !!first || typeof first === "number") &&
    (!!skip || typeof skip === "number" || !!take || typeof take === "number")
  )
    throw invalidPagination("Cannot mix pagination strategies.");

  if (before) {
    if (!isCursor(before)) throw invalidPagination("Cursor is not valid.");

    if (!last || typeof last !== "number" || last < 1)
      throw invalidPagination("Cannot use before without last.");

    return {
      cursor: makeCursorObjFromEntity(before),
      skip: 0,
      take: -(last + 2)!,
    };
  }

  if (after) {
    if (!isCursor(after)) throw invalidPagination("Cursor is not valid.");

    if (!first || typeof first !== "number" || first < 1)
      throw invalidPagination("Cannot use after without first.");

    return {
      cursor: makeCursorObjFromEntity(after),
      skip: 0,
      take: (first + 2)!,
    };
  }

  if (typeof skip === "number") {
    if (skip < 0)
      throw invalidPagination("Cannot use negative numbers for skip.");

    if (take !== undefined && take !== null && typeof take !== "number")
      throw invalidPagination("Take should be a number");

    return {
      cursor: undefined,
      skip,
      take: take ?? TAKE_DEFAULT,
    };
  }

  throw invalidPagination("Invalid pagination strategy.");
};

export { makePaginationObj };

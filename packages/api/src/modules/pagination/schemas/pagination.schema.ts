import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ArgsType, Field, Int } from "type-graphql";

// Decorator import
import { CannotWith } from "@shared/decorators/cannotWith.decorator";
import { OnlyWith } from "@shared/decorators/onlyWith.decorator";

// Constant import
import { TAKE_LIMIT } from "@modules/pagination/constants/paginationLimit.constant";

// Type import
import { Cursor } from "../types/IPagination.type";

// DTO import
import { IPaginationDTO } from "../types/IPagination.dto";

// Scalar import
import { ConnectionCursor } from "@modules/pagination/types/paginationConnectionCursor.scalar";

@ArgsType()
export class SimplePaginationSchema implements IPaginationDTO {
  /**
   * Skip and take pagination
   */

  @IsInt()
  @Min(0)
  @IsOptional()
  @OnlyWith(["take"])
  @CannotWith(["before", "last", "after", "first"])
  @Field(() => Int, {
    nullable: true,
    description: "How many items to skip, to read past the first page.",
  })
  @Type(() => Number)
  skip?: number | null;

  @IsInt()
  @Min(1)
  @Max(TAKE_LIMIT)
  @IsOptional()
  @OnlyWith(["skip"])
  @CannotWith(["before", "last", "after", "first"])
  @Field(() => Int, {
    nullable: true,
    description: "How many items to return.",
  })
  @Type(() => Number)
  take?: number | null;
}

@ArgsType()
export class PaginationSchema
  extends SimplePaginationSchema
  implements IPaginationDTO
{
  /**
   * Before cursor pagination
   */

  @IsOptional()
  @OnlyWith(["last"])
  @CannotWith(["after", "first"])
  @Field(() => ConnectionCursor, { nullable: true })
  before?: Cursor | null;

  @IsInt()
  @Min(1)
  @Max(TAKE_LIMIT)
  @IsOptional()
  @OnlyWith(["before"])
  @CannotWith(["after", "first"])
  @Field(() => Int, { nullable: true })
  @Type(() => Number)
  last?: number | null;

  /**
   * After cursor pagination
   */

  @IsOptional()
  @OnlyWith(["first"])
  @CannotWith(["before", "last"])
  @Field(() => ConnectionCursor, { nullable: true })
  after?: Cursor | null;

  @IsInt()
  @Min(1)
  @Max(TAKE_LIMIT)
  @IsOptional()
  @OnlyWith(["after"])
  @CannotWith(["before", "last"])
  @Field(() => Int, { nullable: true })
  @Type(() => Number)
  first?: number | null;
}

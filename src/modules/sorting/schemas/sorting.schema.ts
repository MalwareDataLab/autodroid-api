import { Field, InputType } from "type-graphql";
import { IsEnum } from "class-validator";
import { Transform } from "class-transformer";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

// Enum import
import { SORT_ORDER } from "../types/sortOrder.enum";

@InputType()
class SortingFieldSchema<T extends readonly string[]> {
  @ValidString()
  @Field(() => String)
  field: T[number];

  @Field(() => SORT_ORDER)
  @ValidString()
  @IsEnum(SORT_ORDER)
  @Transform(({ value }) => SORT_ORDER[value as keyof typeof SORT_ORDER])
  order: SORT_ORDER;
}

export { SortingFieldSchema };

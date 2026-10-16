import { Transform } from "class-transformer";
import { IsEnum } from "class-validator";
import { Field, InputType } from "type-graphql";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

// Enum import
import { SORT_ORDER } from "../types/sortOrder.enum";

@InputType()
class SortingFieldSchema<T extends readonly string[]> {
  @ValidString()
  @Field(() => String, { description: "The field to sort by." })
  field: T[number];

  @Field(() => SORT_ORDER, { description: "The sort direction." })
  @ValidString()
  @IsEnum(SORT_ORDER)
  @Transform(({ value }) =>
    value
      ? SORT_ORDER[String(value).toUpperCase() as keyof typeof SORT_ORDER]
      : null,
  )
  order: SORT_ORDER;
}

export { SortingFieldSchema };

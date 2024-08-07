import { IsInt, Min, Max } from "class-validator";

// Constant import
import {
  MAX_SAFE_INT,
  MIN_SAFE_INT,
} from "@shared/constants/maxSafeInt.constant";

// Decorator import
import { IsNullable, NullableOptions } from "./isNullable.decorator";

export function ValidInt(
  props: { nullable?: NullableOptions } = {
    nullable: false,
  },
) {
  const isInt = IsInt();
  const min = Min(MIN_SAFE_INT);
  const max = Max(MAX_SAFE_INT);

  const isNullable = IsNullable({ nullable: props.nullable });

  return (target: any, key: string) => {
    if (props.nullable) isNullable(target, key);
    isInt(target, key);
    min(target, key);
    max(target, key);
  };
}

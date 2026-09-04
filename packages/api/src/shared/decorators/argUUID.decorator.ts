import { Arg, ParameterDecorator } from "type-graphql";
import { isUUID } from "validator";

// Error import
import { ValidationError } from "@shared/errors/ValidationError";

// Util import
import { validateNullable } from "@shared/utils/validateNullable";

// Type import
import { NullableOptions } from "./isNullable.decorator";
import { Constraint } from "./constraint.decorator";

export function ArgUUID(
  key: string,
  { nullable }: { nullable?: NullableOptions } = {},
): ParameterDecorator {
  const argsDecorator = Arg(key, () => String, {
    validateFn: value => {
      validateNullable({ key, value, nullable });
      if (!isUUID(value, 4))
        throw new ValidationError(`${key} is not a valid CUID`);
    },
  });

  const constraintDecorator = Constraint("format", "cuid");

  return (target, propertyKey, parameterIndex) => {
    argsDecorator(target, propertyKey, parameterIndex);
    constraintDecorator(target, propertyKey, parameterIndex);
  };
}

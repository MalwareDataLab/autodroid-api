import { Arg, ParameterDecorator } from "type-graphql";
import { isUUID } from "validator";

// Error import
import { ValidationError } from "@shared/errors/ValidationError";

// Decorator import
import { Constraint } from "./constraint.decorator";
import { NullableOptions } from "./isNullable.decorator";

// Util import
import { validateNullable } from "@shared/utils/validateNullable";

export function ArgUUID(
  key: string,
  {
    nullable,
    description,
  }: { nullable?: NullableOptions; description?: string } = {},
): ParameterDecorator {
  const argsDecorator = Arg(key, () => String, {
    description,
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

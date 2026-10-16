// Error import
import { ValidationError } from "@shared/errors/ValidationError";

// Decorator import
import { NullableOptions } from "@shared/decorators/isNullable.decorator";

const validateNullable = ({
  key,
  value,
  nullable,
}: {
  key: string;
  value: string;
  nullable: NullableOptions;
}) => {
  if (value) return;
  if (nullable === true) return;
  if (nullable === "allowNull" && value === null) return;
  if (nullable === "allowUndefined" && typeof value === "undefined") return;
  throw new ValidationError(`${key} is required`);
};

export { validateNullable };

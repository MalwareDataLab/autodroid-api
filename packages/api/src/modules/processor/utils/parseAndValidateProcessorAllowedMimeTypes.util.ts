import { isMimeType } from "validator";

// i18n import
import { TFunction } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Enum import
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";

const validateAndGetProcessorAllowedMimeTypes = ({
  allowed_mime_types,
  t,
}: {
  allowed_mime_types: string;
  t: TFunction;
}) => {
  const allowedMimeTypes = allowed_mime_types
    .trim()
    .split(",")
    .map(mimeType => mimeType.trim());
  if (
    !allowedMimeTypes.length ||
    allowedMimeTypes.some(
      mimeType =>
        !mimeType ||
        !isMimeType(mimeType) ||
        !Object.values(MIME_TYPE).includes(mimeType as MIME_TYPE),
    )
  )
    throw new AppError({
      key: "@parse_and_validate_processor_allowed_mime_types/INVALID_MIME_TYPES",
      message: t(
        "@parse_and_validate_processor_allowed_mime_types/INVALID_MIME_TYPES",
        "Invalid mime types.",
      ),
    });

  return allowedMimeTypes;
};

export { validateAndGetProcessorAllowedMimeTypes };

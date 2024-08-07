import mime from "mime-types";

// Enum import
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";

const isValidMimeTypeExtension = (params: {
  mimeType: MIME_TYPE;
  extension: string;
}): boolean => mime.extensions[params.mimeType].includes(params.extension);

export { isValidMimeTypeExtension };

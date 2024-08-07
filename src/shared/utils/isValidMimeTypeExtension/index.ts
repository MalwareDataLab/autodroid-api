import mime from "mime-types";

// Enum import
import { MIME_TYPE } from "@shared/container/providers/StorageProvider/types/mimeType.enum";

const isValidMimeTypeExtension = (params: {
  mimeType: MIME_TYPE;
  extension: string;
}): boolean => mime.extensions[params.mimeType].includes(params.extension);

export { isValidMimeTypeExtension };

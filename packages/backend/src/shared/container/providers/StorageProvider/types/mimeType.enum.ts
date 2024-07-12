import { registerEnumType } from "type-graphql";

enum MIME_TYPE {
  JPEG = "image/jpeg",
  PNG = "image/png",
  PDF = "application/pdf",
  OTHER = "application/octet-stream",
}

registerEnumType(MIME_TYPE, {
  name: "MIME_TYPE",
});

export { MIME_TYPE };

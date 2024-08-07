import { registerEnumType } from "type-graphql";

enum FILE_PROVIDER_STATUS {
  PENDING = "PENDING",
  READY = "READY",
  NOT_FOUND = "NOT_FOUND",
}

registerEnumType(FILE_PROVIDER_STATUS, {
  name: "FILE_PROVIDER_STATUS",
});

export { FILE_PROVIDER_STATUS };

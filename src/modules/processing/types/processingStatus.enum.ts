import { registerEnumType } from "type-graphql";

enum PROCESSING_STATUS {
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  CANCELLED = "CANCELLED",
}

registerEnumType(PROCESSING_STATUS, {
  name: "PROCESSING_STATUS",
});

export { PROCESSING_STATUS };

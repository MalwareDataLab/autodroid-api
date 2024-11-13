import { registerEnumType } from "type-graphql";

enum WORKER_STATUS {
  WORK = "WORK",
  PREPARING = "PREPARING",
  IDLE = "IDLE",
  SHUTDOWN = "SHUTDOWN",
  UNKNOWN = "UNKNOWN",
}

registerEnumType(WORKER_STATUS, {
  name: "WORKER_STATUS",
});

export { WORKER_STATUS };

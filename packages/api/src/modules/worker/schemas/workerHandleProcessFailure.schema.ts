import { ValidString } from "@shared/decorators/validString.decorator";

class WorkerHandleProcessFailureSchema {
  @ValidString({ nullable: true })
  reason?: string | null;
}

export { WorkerHandleProcessFailureSchema };

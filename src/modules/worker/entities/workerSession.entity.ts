import { ObjectType } from "type-graphql";

// Entity import
import { Worker } from "./worker.entity";

@ObjectType()
export class WorkerSession {
  worker: Worker;
}
